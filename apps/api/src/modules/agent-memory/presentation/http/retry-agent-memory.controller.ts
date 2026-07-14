import { Controller, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AgentMemoryMaintenanceService,
  type AgentMemoryRecoverResult,
} from '../../application/agent-memory-maintenance.service';
import { requireMemoryOwnerKey } from './memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memories/:memoryId/retry')
export class RetryAgentMemoryController {
  constructor(private readonly maintenance: AgentMemoryMaintenanceService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({ summary: '重新投递单条 pending/dead 图片情景任务' })
  async execute(
    @Param('agentId') agentId: string,
    @Param('memoryId') memoryId: string,
    @Query('ownerKey') ownerKey?: string,
  ): Promise<AgentMemoryRecoverResult> {
    return this.maintenance.recover(
      agentId,
      requireMemoryOwnerKey(ownerKey),
      memoryId,
    );
  }
}
