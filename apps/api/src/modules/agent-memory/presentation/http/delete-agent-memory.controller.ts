import { Controller, Delete, Headers, HttpCode, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryManagementService } from '../../application/agent-memory-management.service';
import { MemoryOwnerIdentity } from '../../application/memory-owner-identity';
import {
  ApiMemoryOwnerToken,
  resolveRequiredMemoryOwnerKey,
} from './resolve-memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memories/:memoryId')
export class DeleteAgentMemoryController {
  constructor(
    private readonly memory: AgentMemoryManagementService,
    private readonly identity: MemoryOwnerIdentity,
  ) {}

  @Delete()
  @ApiMemoryOwnerToken()
  @HttpCode(204)
  @ApiOperation({ summary: '删除一条智能体长期记忆' })
  async execute(
    @Param('agentId') agentId: string,
    @Param('memoryId') memoryId: string,
    @Headers('x-memory-owner-token') ownerToken?: string,
  ): Promise<void> {
    await this.memory.deleteMemory(
      agentId,
      resolveRequiredMemoryOwnerKey(ownerToken, this.identity),
      memoryId,
    );
  }
}
