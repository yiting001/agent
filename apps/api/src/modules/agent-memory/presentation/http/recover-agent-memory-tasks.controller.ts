import { Controller, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AgentMemoryMaintenanceService,
  type AgentMemoryRecoverResult,
} from '../../application/agent-memory-maintenance.service';
import { MemoryOwnerIdentity } from '../../application/memory-owner-identity';
import {
  ApiMemoryOwnerToken,
  resolveRequiredMemoryOwnerKey,
} from './resolve-memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memory-tasks/recover')
export class RecoverAgentMemoryTasksController {
  constructor(
    private readonly maintenance: AgentMemoryMaintenanceService,
    private readonly identity: MemoryOwnerIdentity,
  ) {}

  @Post()
  @ApiMemoryOwnerToken()
  @HttpCode(202)
  @ApiOperation({
    summary: '批量恢复 owner 范围内的 dead/pending 图片情景任务',
  })
  async execute(
    @Param('agentId') agentId: string,
    @Headers('x-memory-owner-token') ownerToken?: string,
  ): Promise<AgentMemoryRecoverResult> {
    return this.maintenance.recover(
      agentId,
      resolveRequiredMemoryOwnerKey(ownerToken, this.identity),
    );
  }
}
