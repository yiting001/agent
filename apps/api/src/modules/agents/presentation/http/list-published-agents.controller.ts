import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { PublicAgentSummary } from '../../domain/agent';
import { ListPublishedAgentsUseCase } from '../../application/list-published-agents.use-case';

@ApiTags('public-agents')
@Controller('public/agents')
export class ListPublishedAgentsController {
  constructor(private readonly useCase: ListPublishedAgentsUseCase) {}

  @Get()
  @ApiOperation({ summary: '列出可公开对话的已发布智能体' })
  execute(): Promise<PublicAgentSummary[]> {
    return this.useCase.execute();
  }
}
