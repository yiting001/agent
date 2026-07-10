import { Controller, Get } from '@nestjs/common';

import type { AgentSummary } from '../../domain/agent';
import { ListAgentsUseCase } from '../../application/list-agents.use-case';

@Controller('agents')
export class ListAgentsController {
  constructor(private readonly useCase: ListAgentsUseCase) {}

  @Get()
  execute(): Promise<AgentSummary[]> {
    return this.useCase.execute();
  }
}
