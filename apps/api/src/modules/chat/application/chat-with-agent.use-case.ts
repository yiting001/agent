import { Injectable, Logger } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { AgentCatalogService } from '../../agents/application/agent-catalog.service';
import { AgentRepository } from '../../agents/application/agent.repository';
import { AgentMemoryService } from '../../agent-memory/application/agent-memory.service';
import { KnowledgeRetrieverService } from '../../knowledge/application/knowledge-retriever.service';
import {
  type ChatMessageInput,
  type ChatTextContentPart,
  ModelGateway,
} from '../../model-providers/application/model-gateway';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import { SkillRuntimeService } from '../../skills/application/skill-runtime.service';
import type { Skill } from '../../skills/domain/skill';
import { ObservabilityContext } from '../../observability/infrastructure/observability-context';
import type { AgentChatResponse, ConversationMessage } from '../domain/chat';
import { ChatAttachmentStorage } from './chat-attachment.storage';
import { SkillToolLoopService } from './skill-tool-loop.service';

export interface ChatWithAgentCommand {
  /** 调用方来源：admin 无限制；public 排除已停用；api 仅限已发布。 */
  access: 'admin' | 'api' | 'public';
  agentId: string;
  conversationId?: string;
  memoryOwnerKey?: string;
  messages: ConversationMessage[];
}

export interface StreamingAgentChatResponse {
  agentId: string;
  citations: AgentChatResponse['citations'];
  content: AsyncIterable<string>;
  conversationId?: string;
}

function buildKnowledgeContext(
  results: Awaited<ReturnType<KnowledgeRetrieverService['retrieve']>>,
): string {
  if (results.length === 0) {
    return '未检索到可用知识片段。';
  }

  return results
    .map(
      (result, index) =>
        `[资料 ${index + 1}｜${result.fileName}]\n${result.content}`,
    )
    .join('\n\n');
}

function buildSkillInstructions(instructions: Skill[]): string {
  if (instructions.length === 0) {
    return '';
  }

  const sections = instructions
    .map((skill) => `### ${skill.name}\n${skill.content}`)
    .join('\n\n');

  return `\n\n你已安装下列技能指令，回答时须遵循：\n\n${sections}`;
}

function buildTextOnlyMessages(
  messages: ConversationMessage[],
): ChatMessageInput[] {
  return messages.map((message) => {
    const attachmentNote = message.attachments?.length
      ? `\n\n（用户上传了附件：${message.attachments
          .map((attachment) => attachment.fileName)
          .join('、')}，当前模型不支持解析多模态内容，附件已省略。）`
      : '';

    return {
      content: `${message.content}${attachmentNote}`,
      role: message.role,
    };
  });
}

@Injectable()
export class ChatWithAgentUseCase {
  private readonly logger = new Logger(ChatWithAgentUseCase.name);

  constructor(
    private readonly agents: AgentCatalogService,
    private readonly agentRepository: AgentRepository,
    private readonly agentMemory: AgentMemoryService,
    private readonly knowledgeRetriever: KnowledgeRetrieverService,
    private readonly modelProviders: ModelProviderRuntimeService,
    private readonly modelGateway: ModelGateway,
    private readonly attachmentStorage: ChatAttachmentStorage,
    private readonly skillRuntime: SkillRuntimeService,
    private readonly toolLoop: SkillToolLoopService,
    private readonly observabilityContext: ObservabilityContext,
  ) {}

  async execute(command: ChatWithAgentCommand): Promise<AgentChatResponse> {
    const response = await this.executeStream(command);
    let answer = '';

    for await (const delta of response.content) {
      answer += delta;
    }

    return {
      agentId: response.agentId,
      answer,
      citations: response.citations,
      conversationId: response.conversationId,
    };
  }

  async executeStream(
    command: ChatWithAgentCommand,
  ): Promise<StreamingAgentChatResponse> {
    this.observabilityContext.enrich({
      agentId: command.agentId,
      conversationId: command.conversationId,
      source: command.access,
    });
    const agent = await this.agents.get(command.agentId);

    if (command.access === 'api' && agent.status !== 'published') {
      throw new ApplicationError(
        'invalid_operation',
        '智能体尚未发布，不能通过正式 API 调用。',
      );
    }

    if (command.access === 'public' && agent.status === 'disabled') {
      throw new ApplicationError(
        'invalid_operation',
        '智能体已停用，暂时无法对话。',
      );
    }

    const latestUserMessage = [...command.messages]
      .reverse()
      .find((message) => message.role === 'user');

    if (!latestUserMessage) {
      throw new ApplicationError(
        'invalid_operation',
        '对话消息中必须包含用户问题。',
      );
    }

    const [provider, knowledge, skillSet, memoryContext] = await Promise.all([
      this.modelProviders.get(agent.providerId),
      this.knowledgeRetriever.retrieve(
        agent.moduleIds,
        latestUserMessage.content.trim() || '请分析用户上传的图片或音频附件。',
      ),
      this.skillRuntime.load(agent.skillIds),
      this.agentMemory.composeContext({
        agentId: agent.id,
        conversationId: command.conversationId,
        incomingMessages: command.messages,
        ownerKey: command.memoryOwnerKey,
        query: latestUserMessage.content,
      }),
    ]);

    if (!provider.chatModel) {
      throw new ApplicationError(
        'invalid_operation',
        '智能体模型未配置对话模型。',
      );
    }

    const conversationMessages = await this.buildConversationMessages(
      memoryContext.messages,
    );
    const systemMessage: ChatMessageInput = {
      content: `${agent.systemPrompt}

请优先依据下列企业知识回答；无法从资料确认时应明确说明，不得编造。

${buildKnowledgeContext(knowledge)}

以下是跨会话长期记忆。若与当前问题相关，可以用于保持偏好、事实和历史连续性；若无关则忽略。

${memoryContext.longTermContext}${buildSkillInstructions(skillSet.instructions)}`,
      role: 'system',
    };
    const request = {
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      inputCostPerMillionTokens: provider.chatInputCostPerMillionTokens,
      messages: [systemMessage, ...conversationMessages],
      model: provider.chatModel,
      operation: 'chat.generate',
      outputCostPerMillionTokens: provider.chatOutputCostPerMillionTokens,
      providerId: provider.id,
      temperature: agent.temperature,
    };
    const hasMultimodalContent = conversationMessages.some(
      (message) => typeof message.content !== 'string',
    );
    const content =
      skillSet.toolProviders.length > 0
        ? this.streamToolLoop(request, skillSet.toolProviders)
        : hasMultimodalContent
          ? this.streamWithTextOnlyFallback(request, [
              systemMessage,
              ...buildTextOnlyMessages(memoryContext.messages),
            ])
          : this.modelGateway.streamChat(request);

    return {
      agentId: agent.id,
      citations: knowledge.map((result) => ({
        documentId: result.documentId,
        fileName: result.fileName,
        moduleId: result.moduleId,
        score: result.score,
      })),
      content: this.trackConversation(
        {
          agentId: agent.id,
          conversationId: command.conversationId,
          memoryOwnerKey: command.memoryOwnerKey,
          messages: command.messages,
          source: command.access,
        },
        content,
      ),
      conversationId: command.conversationId,
    };
  }

  private async buildConversationMessages(
    messages: ConversationMessage[],
  ): Promise<ChatMessageInput[]> {
    return Promise.all(
      messages.map(async (message): Promise<ChatMessageInput> => {
        if (!message.attachments?.length) {
          return { content: message.content, role: message.role };
        }

        if (message.role !== 'user') {
          throw new ApplicationError(
            'invalid_operation',
            '只有用户消息可以携带多模态附件。',
          );
        }

        const parts: Exclude<ChatMessageInput['content'], string> = [];

        if (message.content.trim()) {
          const text: ChatTextContentPart = {
            text: message.content,
            type: 'text',
          };

          parts.push(text);
        }

        for (const reference of message.attachments) {
          const attachment = await this.attachmentStorage.read(reference.id);
          const data = attachment.content.toString('base64');

          if (attachment.mimeType.startsWith('image/')) {
            parts.push({
              image_url: {
                url: `data:${attachment.mimeType};base64,${data}`,
              },
              type: 'image_url',
            });
          } else {
            parts.push({
              input_audio: {
                data,
                format: attachment.mimeType === 'audio/mpeg' ? 'mp3' : 'wav',
              },
              type: 'input_audio',
            });
          }
        }

        return { content: parts, role: message.role };
      }),
    );
  }

  /** 带工具技能时走 function calling 执行环，最终回答以单块内容输出。 */
  private async *streamToolLoop(
    request: Parameters<ModelGateway['streamChat']>[0],
    toolProviders: Skill[],
  ): AsyncIterable<string> {
    const answer = await this.toolLoop.run(
      {
        apiKey: request.apiKey,
        baseUrl: request.baseUrl,
        inputCostPerMillionTokens: request.inputCostPerMillionTokens,
        messages: request.messages,
        model: request.model,
        operation: 'chat.tool_round',
        outputCostPerMillionTokens: request.outputCostPerMillionTokens,
        providerId: request.providerId,
        temperature: request.temperature,
      },
      toolProviders,
    );

    if (answer) {
      yield answer;
    }
  }

  /**
   * 先按多模态格式调用；若模型服务在输出任何内容前拒绝（如不支持
   * image_url/input_audio 的纯文本模型），自动降级为纯文本消息重试。
   */
  private async *streamWithTextOnlyFallback(
    request: Parameters<ModelGateway['streamChat']>[0],
    textOnlyMessages: ChatMessageInput[],
  ): AsyncIterable<string> {
    let yielded = false;

    try {
      for await (const delta of this.modelGateway.streamChat(request)) {
        yielded = true;
        yield delta;
      }

      return;
    } catch (error) {
      if (yielded) {
        throw error;
      }
    }

    yield* this.modelGateway.streamChat({
      ...request,
      messages: textOnlyMessages,
    });
  }

  private async *trackConversation(
    command: {
      agentId: string;
      conversationId?: string;
      memoryOwnerKey?: string;
      messages: ConversationMessage[];
      source: ChatWithAgentCommand['access'];
    },
    content: AsyncIterable<string>,
  ): AsyncIterable<string> {
    let answer = '';
    let completed = false;

    try {
      for await (const delta of content) {
        answer += delta;
        yield delta;
      }

      completed = true;
    } finally {
      if (completed) {
        await this.agentRepository.incrementConversationCount(command.agentId);

        try {
          await this.agentMemory.recordTurn({
            agentId: command.agentId,
            answer,
            conversationId: command.conversationId,
            messages: command.messages,
            ownerKey: command.memoryOwnerKey,
            source: command.source,
          });
        } catch (error) {
          this.logger.warn(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : '记忆写入发生未知错误',
              operation: 'agent_memory.record_turn',
            }),
          );
        }
      }
    }
  }
}
