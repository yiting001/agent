import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { AgentCatalogService } from '../../agents/application/agent-catalog.service';
import { AgentRepository } from '../../agents/application/agent.repository';
import { KnowledgeRetrieverService } from '../../knowledge/application/knowledge-retriever.service';
import { ModelGateway } from '../../model-providers/application/model-gateway';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import type { AgentChatResponse, ConversationMessage } from '../domain/chat';

export interface ChatWithAgentCommand {
  agentId: string;
  messages: ConversationMessage[];
  requirePublished: boolean;
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
  ) {}

  async execute(command: ChatWithAgentCommand): Promise<AgentChatResponse> {
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
        latestUserMessage.content,
      ),
    ]);

    if (!provider.chatModel) {
      throw new ApplicationError(
        'invalid_operation',
        '智能体模型未配置对话模型。',
      );
    }

    const answer = await this.modelGateway.chat({
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      messages: [
        {
          content: `${agent.systemPrompt}

请优先依据下列企业知识回答；无法从资料确认时应明确说明，不得编造。

${buildKnowledgeContext(knowledge)}`,
          role: 'system',
        },
        ...command.messages,
      ],
      model: provider.chatModel,
      temperature: agent.temperature,
    });

    await this.agentRepository.incrementConversationCount(agent.id);

    return {
      agentId: agent.id,
      answer,
      citations: knowledge.map((result) => ({
        documentId: result.documentId,
        fileName: result.fileName,
        moduleId: result.moduleId,
        score: result.score,
      })),
    };
  }
}
