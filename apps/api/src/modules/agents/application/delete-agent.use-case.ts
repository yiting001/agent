import { Injectable } from '@nestjs/common';

import { AgentCatalogService } from './agent-catalog.service';
import { AgentRepository } from './agent.repository';

/** 删除智能体及其知识模块绑定。 */
@Injectable()
export class DeleteAgentUseCase {
  constructor(
    private readonly catalog: AgentCatalogService,
    private readonly repository: AgentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.catalog.get(id);
    await this.repository.delete(id);
  }
}
