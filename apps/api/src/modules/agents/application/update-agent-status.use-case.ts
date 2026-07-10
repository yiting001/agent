import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { AgentStatus, AgentSummary } from '../domain/agent';
import { AgentCatalogService } from './agent-catalog.service';
import { AgentRepository } from './agent.repository';
import { toAgentSummary } from './agent-summary';

@Injectable()
export class UpdateAgentStatusUseCase {
  constructor(
    private readonly catalog: AgentCatalogService,
    private readonly repository: AgentRepository,
  ) {}

  async execute(id: string, status: AgentStatus): Promise<AgentSummary> {
    const agent = await this.catalog.get(id);

    if (status === 'published' && agent.moduleIds.length === 0) {
      throw new ApplicationError(
        'invalid_operation',
        '发布智能体前至少绑定一个知识模块。',
      );
    }

    const updatedAgent = {
      ...agent,
      status,
      updatedAt: new Date(),
    };

    await this.repository.updateStatus(id, status);

    return toAgentSummary(updatedAgent, agent.moduleIds);
  }
}
