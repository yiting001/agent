import { Injectable } from '@nestjs/common';

import { AgentCatalogService } from './agent-catalog.service';
import { AgentRepository } from './agent.repository';

export interface DeleteAgentResult {
  id: string;
}

@Injectable()
export class DeleteAgentUseCase {
  constructor(
    private readonly catalog: AgentCatalogService,
    private readonly repository: AgentRepository,
  ) {}

  async execute(id: string): Promise<DeleteAgentResult> {
    await this.catalog.get(id);
    await this.repository.delete(id);

    return { id };
  }
}
