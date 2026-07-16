import { Injectable } from '@nestjs/common';

import { AgentCatalogService } from '../../agents/application/agent-catalog.service';
import { ChatWithAgentUseCase } from '../../chat/application/chat-with-agent.use-case';
import {
  EvaluationAgentGateway,
  type EvaluationAgentReference,
} from '../application/evaluation-agent.gateway';

@Injectable()
export class ChatEvaluationAgentGateway extends EvaluationAgentGateway {
  constructor(
    private readonly agents: AgentCatalogService,
    private readonly chat: ChatWithAgentUseCase,
  ) {
    super();
  }

  async get(agentId: string): Promise<EvaluationAgentReference> {
    const agent = await this.agents.get(agentId);

    return { status: agent.status };
  }

  async run(agentId: string, input: string): Promise<string> {
    const response = await this.chat.execute({
      access: 'evaluation',
      agentId,
      messages: [{ content: input, role: 'user' }],
    });

    return response.answer;
  }
}
