import { Body, Controller, Post } from '@nestjs/common';

import type { AgentSummary } from '../../domain/agent';
import { CreateAgentUseCase } from '../../application/create-agent.use-case';
import { CreateAgentDto } from './create-agent.dto';

@Controller('agents')
export class CreateAgentController {
  constructor(private readonly useCase: CreateAgentUseCase) {}

  @Post()
  execute(@Body() body: CreateAgentDto): Promise<AgentSummary> {
    return this.useCase.execute(body);
  }
}
