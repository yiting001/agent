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
@Controller('agents/:agentId/memories/:memoryId/retry')
export class RetryAgentMemoryController {
  constructor(
    private readonly maintenance: AgentMemoryMaintenanceService,
    private readonly identity: MemoryOwnerIdentity,
  ) {}

  @Post()
  @ApiMemoryOwnerToken()
  @HttpCode(202)
  @ApiOperation({ summary: '重新投递单条 pending/dead 图片情景任务' })
  async execute(
    @Param('agentId') agentId: string,
    @Param('memoryId') memoryId: string,
    @Headers('x-memory-owner-token') ownerToken?: string,
  ): Promise<AgentMemoryRecoverResult> {
    return this.maintenance.recover(
      agentId,
      resolveRequiredMemoryOwnerKey(ownerToken, this.identity),
      memoryId,
    );
  }
}
