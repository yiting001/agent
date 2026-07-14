import { Controller, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AgentMemoryMaintenanceService,
  type AgentMemoryRecoverResult,
} from '../../application/agent-memory-maintenance.service';
import { requireMemoryOwnerKey } from './memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memory-tasks/recover')
export class RecoverAgentMemoryTasksController {
  constructor(private readonly maintenance: AgentMemoryMaintenanceService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({
    summary: '批量恢复 owner 范围内的 dead/pending 图片情景任务',
  })
  async execute(
    @Param('agentId') agentId: string,
    @Query('ownerKey') ownerKey?: string,
  ): Promise<AgentMemoryRecoverResult> {
    return this.maintenance.recover(agentId, requireMemoryOwnerKey(ownerKey));
  }
}
