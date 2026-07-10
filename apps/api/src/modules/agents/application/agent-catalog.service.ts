import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { AgentDetail } from '../domain/agent';
import { AgentRepository } from './agent.repository';

@Injectable()
export class AgentCatalogService {
  constructor(private readonly repository: AgentRepository) {}

  async get(id: string): Promise<AgentDetail> {
    const agent = await this.repository.findById(id);

    if (!agent) {
      throw new ApplicationError('not_found', '智能体不存在。');
    }

    return agent;
  }
}
