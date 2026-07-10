import { Body, Controller, Param, Patch } from '@nestjs/common';

import type { AgentSummary } from '../../domain/agent';
import { UpdateAgentStatusUseCase } from '../../application/update-agent-status.use-case';
import { UpdateAgentStatusDto } from './update-agent-status.dto';

@Controller('agents')
export class UpdateAgentStatusController {
  constructor(private readonly useCase: UpdateAgentStatusUseCase) {}

  @Patch(':id/status')
  execute(
    @Param('id') id: string,
    @Body() body: UpdateAgentStatusDto,
  ): Promise<AgentSummary> {
    return this.useCase.execute(id, body.status);
  }
}
