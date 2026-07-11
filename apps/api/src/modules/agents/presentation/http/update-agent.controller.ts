import { Body, Controller, Param, Put } from '@nestjs/common';

import type { AgentSummary } from '../../domain/agent';
import { UpdateAgentUseCase } from '../../application/update-agent.use-case';
import { CreateAgentDto } from './create-agent.dto';

@Controller('agents')
export class UpdateAgentController {
  constructor(private readonly useCase: UpdateAgentUseCase) {}

  @Put(':id')
  execute(
    @Param('id') id: string,
    @Body() body: CreateAgentDto,
  ): Promise<AgentSummary> {
    return this.useCase.execute(id, body);
  }
}
