import { Controller, Delete, Headers, HttpCode, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryManagementService } from '../../application/agent-memory-management.service';
import { MemoryOwnerIdentity } from '../../application/memory-owner-identity';
import {
  ApiMemoryOwnerToken,
  resolveRequiredMemoryOwnerKey,
} from './resolve-memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memories')
export class ClearAgentMemoryController {
  constructor(
    private readonly memory: AgentMemoryManagementService,
    private readonly identity: MemoryOwnerIdentity,
  ) {}

  @Delete()
  @ApiMemoryOwnerToken()
  @HttpCode(204)
  @ApiOperation({ summary: '清空 owner 的短期和长期记忆' })
  async execute(
    @Param('agentId') agentId: string,
    @Headers('x-memory-owner-token') ownerToken?: string,
  ): Promise<void> {
    await this.memory.clearAgentMemory(
      agentId,
      resolveRequiredMemoryOwnerKey(ownerToken, this.identity),
    );
  }
}
