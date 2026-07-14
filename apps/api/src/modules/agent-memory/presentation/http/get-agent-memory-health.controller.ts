import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryMaintenanceService } from '../../application/agent-memory-maintenance.service';
import { MemoryOwnerIdentity } from '../../application/memory-owner-identity';
import type { AgentMemoryHealth } from '../../application/agent-memory-task.repository';
import {
  ApiMemoryOwnerToken,
  resolveRequiredMemoryOwnerKey,
} from './resolve-memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memory-health')
export class GetAgentMemoryHealthController {
  constructor(
    private readonly maintenance: AgentMemoryMaintenanceService,
    private readonly identity: MemoryOwnerIdentity,
  ) {}

  @Get()
  @ApiMemoryOwnerToken()
  @ApiOperation({ summary: '巡检并返回 owner 范围内的图片情景记忆健康状态' })
  async execute(
    @Param('agentId') agentId: string,
    @Headers('x-memory-owner-token') ownerToken?: string,
  ): Promise<AgentMemoryHealth> {
    const scopedOwnerKey = resolveRequiredMemoryOwnerKey(
      ownerToken,
      this.identity,
    );

    await this.maintenance.repairOwner(agentId, scopedOwnerKey);

    return this.maintenance.getHealth(agentId, scopedOwnerKey);
  }
}
