import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryMaintenanceService } from '../../application/agent-memory-maintenance.service';
import type { AgentMemoryHealth } from '../../application/agent-memory-task.repository';
import { requireMemoryOwnerKey } from './memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memory-health')
export class GetAgentMemoryHealthController {
  constructor(private readonly maintenance: AgentMemoryMaintenanceService) {}

  @Get()
  @ApiOperation({ summary: '巡检并返回 owner 范围内的图片情景记忆健康状态' })
  async execute(
    @Param('agentId') agentId: string,
    @Query('ownerKey') ownerKey?: string,
  ): Promise<AgentMemoryHealth> {
    const scopedOwnerKey = requireMemoryOwnerKey(ownerKey);

    await this.maintenance.repairOwner(agentId, scopedOwnerKey);

    return this.maintenance.getHealth(agentId, scopedOwnerKey);
  }
}
