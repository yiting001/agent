import { Injectable, Logger } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { AgentCatalogService } from '../../agents/application/agent-catalog.service';
import { AgentRepository } from '../../agents/application/agent.repository';
import { AgentEpisodicMemoryService } from '../../agent-memory/application/agent-episodic-memory.service';
import { AgentMemoryService } from '../../agent-memory/application/agent-memory.service';
import { AgentMemoryTaskDispatcher } from '../../agent-memory/application/agent-memory-task.dispatcher';
import { KnowledgeRetrieverService } from '../../knowledge/application/knowledge-retriever.service';
import {
  type ChatMessageInput,
  type ChatTextContentPart,
  ModelGateway,
} from '../../model-providers/application/model-gateway';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import { PromptPolicyRuntimeService } from '../../prompt-policies/application/prompt-policy-runtime.service';
import { SkillRuntimeService } from '../../skills/application/skill-runtime.service';
import type { Skill } from '../../skills/domain/skill';
import { ObservabilityContext } from '../../observability/infrastructure/observability-context';
import type { AgentChatResponse, ConversationMessage } from '../domain/chat';
import { ChatAttachmentStorage } from './chat-attachment.storage';
import { SkillToolLoopService } from './skill-tool-loop.service';
import { composeSystemPrompt } from './system-prompt.composer';

/** 各聊天与评估入口共享的应用命令。 */
export interface ChatWithAgentCommand {
  /** 调用方来源：evaluation 不写入用户记忆或对话计数。 */
  access: 'admin' | 'api' | 'evaluation' | 'public';
  agentId: string;
  /** 复用已有记忆线程；缺省时可创建新线程。 */
  conversationId?: string;
  /** 记忆和附件隔离键，当前必须由上层认证绑定可信主体。 */
  memoryOwnerKey?: string;
  messages: ConversationMessage[];
}

/** 流式聊天元数据及按序文本增量。 */
export interface StreamingAgentChatResponse {
  agentId: string;
  citations: AgentChatResponse['citations'];
  content: AsyncIterable<string>;
  conversationId?: string;
}

/** 多模态调用失败时生成明确告知附件被省略的纯文本消息。 */
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

/** 编排 Agent、RAG、长期记忆、情景证据、技能和模型流式输出。 */
@Injectable()
export class ChatWithAgentUseCase {
  private readonly logger = new Logger(ChatWithAgentUseCase.name);

  constructor(
    private readonly agents: AgentCatalogService,
    private readonly agentRepository: AgentRepository,
    private readonly agentMemory: AgentMemoryService,
    private readonly episodicMemory: AgentEpisodicMemoryService,
    private readonly memoryTaskDispatcher: AgentMemoryTaskDispatcher,
    private readonly knowledgeRetriever: KnowledgeRetrieverService,
    private readonly modelProviders: ModelProviderRuntimeService,
    private readonly modelGateway: ModelGateway,
    private readonly attachmentStorage: ChatAttachmentStorage,
    private readonly promptPolicies: PromptPolicyRuntimeService,
    private readonly skillRuntime: SkillRuntimeService,
    private readonly toolLoop: SkillToolLoopService,
    private readonly observabilityContext: ObservabilityContext,
  ) {}

  /** 消费流式用例并聚合为非流式响应。 */
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

  /** 并行加载上下文后选择工具循环、多模态降级或普通流式模型路径。 */
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
        '智能体已停用，暂时无法公开对话。',
      );
    }

    if (command.access === 'public' && agent.status === 'draft') {
      throw new ApplicationError(
        'invalid_operation',
        '智能体尚未发布，暂时无法公开对话。',
      );
    }

    if (command.access === 'evaluation' && agent.status === 'disabled') {
      throw new ApplicationError(
        'invalid_operation',
        '已停用的智能体不能执行评估。',
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

    const [
      provider,
      knowledge,
      policies,
      skillSet,
      memoryContext,
      episodicContext,
    ] = await Promise.all([
      this.modelProviders.get(agent.providerId),
      this.knowledgeRetriever.retrieve(
        agent.moduleIds,
        latestUserMessage.content.trim() || '请分析用户上传的图片或音频附件。',
      ),
      this.promptPolicies.loadEnabled(),
      this.skillRuntime.load(agent.skillIds),
      this.agentMemory.composeContext({
        agentId: agent.id,
        conversationId: command.conversationId,
        incomingMessages: command.messages,
        ownerKey: command.memoryOwnerKey,
        query: latestUserMessage.content,
      }),
      this.episodicMemory.composeContext({
        agentId: agent.id,
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
      agent.id,
      command.memoryOwnerKey,
    );
    const episodicEvidence = await this.buildEpisodicEvidenceMessages(
      episodicContext.artifacts,
      agent.id,
      command.memoryOwnerKey,
    );
    const systemMessage: ChatMessageInput = {
      content: composeSystemPrompt({
        agentPrompt: agent.systemPrompt,
        episodicContext: episodicContext.context,
        knowledge,
        longTermContext: memoryContext.longTermContext,
        policies,
        skills: skillSet.instructions,
      }),
      role: 'system',
    };
    const requestMessages = [
      systemMessage,
      ...episodicEvidence,
      ...conversationMessages,
    ];
    const request = {
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      inputCostPerMillionTokens: provider.chatInputCostPerMillionTokens,
      messages: requestMessages,
      model: provider.chatModel,
      operation: 'chat.generate',
      outputCostPerMillionTokens: provider.chatOutputCostPerMillionTokens,
      providerId: provider.id,
      temperature: agent.temperature,
    };
    const hasMultimodalContent = requestMessages.some(
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

  /** 读取并验证 owner 约束的附件，转换为模型兼容多模态消息。 */
  private async buildConversationMessages(
    messages: ConversationMessage[],
    agentId: string,
    ownerKey?: string,
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
          const attachment = await this.attachmentStorage.read(
            reference.id,
            ownerKey ? { agentId, ownerKey } : undefined,
          );
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

  /** 将召回的历史图片作为不可信外部证据附加到上下文。 */
  private async buildEpisodicEvidenceMessages(
    artifacts: Awaited<
      ReturnType<AgentEpisodicMemoryService['composeContext']>
    >['artifacts'],
    agentId: string,
    ownerKey?: string,
  ): Promise<ChatMessageInput[]> {
    if (!ownerKey || artifacts.length === 0) {
      return [];
    }

    const parts: Exclude<ChatMessageInput['content'], string> = [
      {
        text:
          '以下图片来自已召回的历史情景，仅作为当前问题的外部证据。' +
          '如果图片不足以确认答案，请说明不确定或向用户澄清。',
        type: 'text',
      },
    ];

    for (const artifact of artifacts) {
      const attachment = await this.attachmentStorage.read(
        artifact.attachmentId,
        { agentId, ownerKey },
      );

      parts.push({
        image_url: {
          url: `data:${attachment.mimeType};base64,${attachment.content.toString('base64')}`,
        },
        type: 'image_url',
      });
    }

    return [
      { content: parts, role: 'user' },
      {
        content: '已读取历史图片证据，将仅用于回答用户当前问题。',
        role: 'assistant',
      },
    ];
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

  /** 流完整结束后才计数；记忆失败不反向破坏已交付的回答。 */
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
      if (completed && command.source !== 'evaluation') {
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

        try {
          const taskEnqueued = await this.episodicMemory.recordEpisode({
            agentId: command.agentId,
            answer,
            conversationId: command.conversationId,
            messages: command.messages,
            ownerKey: command.memoryOwnerKey,
          });

          if (taskEnqueued) {
            this.memoryTaskDispatcher.dispatch();
          }
        } catch (error) {
          this.logger.warn(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : '图片情景记忆写入发生未知错误',
              operation: 'agent_memory.record_episode',
            }),
          );
        }
      }
    }
  }
}
