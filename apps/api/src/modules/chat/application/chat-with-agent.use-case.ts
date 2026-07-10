import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { AgentCatalogService } from '../../agents/application/agent-catalog.service';
import { AgentRepository } from '../../agents/application/agent.repository';
import { KnowledgeRetrieverService } from '../../knowledge/application/knowledge-retriever.service';
import {
  type ChatMessageInput,
  type ChatTextContentPart,
  ModelGateway,
} from '../../model-providers/application/model-gateway';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import type { AgentChatResponse, ConversationMessage } from '../domain/chat';
import { ChatAttachmentStorage } from './chat-attachment.storage';

export interface ChatWithAgentCommand {
  agentId: string;
  messages: ConversationMessage[];
  requirePublished: boolean;
}

export interface StreamingAgentChatResponse {
  agentId: string;
  citations: AgentChatResponse['citations'];
  content: AsyncIterable<string>;
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

@Injectable()
export class ChatWithAgentUseCase {
  constructor(
    private readonly agents: AgentCatalogService,
    private readonly agentRepository: AgentRepository,
    private readonly knowledgeRetriever: KnowledgeRetrieverService,
    private readonly modelProviders: ModelProviderRuntimeService,
    private readonly modelGateway: ModelGateway,
    private readonly attachmentStorage: ChatAttachmentStorage,
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
    };
  }

  async executeStream(
    command: ChatWithAgentCommand,
  ): Promise<StreamingAgentChatResponse> {
    const agent = await this.agents.get(command.agentId);

    if (command.requirePublished && agent.status !== 'published') {
      throw new ApplicationError(
        'invalid_operation',
        '智能体尚未发布，不能通过正式 API 调用。',
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

    const [provider, knowledge] = await Promise.all([
      this.modelProviders.get(agent.providerId),
      this.knowledgeRetriever.retrieve(
        agent.moduleIds,
        latestUserMessage.content.trim() || '请分析用户上传的图片或音频附件。',
      ),
    ]);

    if (!provider.chatModel) {
      throw new ApplicationError(
        'invalid_operation',
        '智能体模型未配置对话模型。',
      );
    }

    const conversationMessages = await this.buildConversationMessages(
      command.messages,
    );
    const content = this.modelGateway.streamChat({
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      messages: [
        {
          content: `${agent.systemPrompt}

请优先依据下列企业知识回答；无法从资料确认时应明确说明，不得编造。

${buildKnowledgeContext(knowledge)}`,
          role: 'system',
        },
        ...conversationMessages,
      ],
      model: provider.chatModel,
      temperature: agent.temperature,
    });

    return {
      agentId: agent.id,
      citations: knowledge.map((result) => ({
        documentId: result.documentId,
        fileName: result.fileName,
        moduleId: result.moduleId,
        score: result.score,
      })),
      content: this.trackConversation(agent.id, content),
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

  private async *trackConversation(
    agentId: string,
    content: AsyncIterable<string>,
  ): AsyncIterable<string> {
    let completed = false;

    try {
      for await (const delta of content) {
        yield delta;
      }

      completed = true;
    } finally {
      if (completed) {
        await this.agentRepository.incrementConversationCount(agentId);
      }
    }
  }
}
