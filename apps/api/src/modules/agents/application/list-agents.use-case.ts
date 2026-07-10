import { Injectable } from '@nestjs/common';

import type { AgentSummary } from '../domain/agent';
import { AgentRepository } from './agent.repository';

@Injectable()
export class ListAgentsUseCase {
  constructor(private readonly repository: AgentRepository) {}

  execute(): Promise<AgentSummary[]> {
    return this.repository.list();
  }
}
