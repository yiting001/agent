import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryManagementService } from '../../application/agent-memory-management.service';
import { MemoryOwnerIdentity } from '../../application/memory-owner-identity';
import {
  type AgentMemorySummary,
  toAgentMemorySummary,
} from '../../domain/agent-memory';
import {
  ApiMemoryOwnerToken,
  resolveRequiredMemoryOwnerKey,
} from './resolve-memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memories')
export class ListAgentMemoriesController {
  constructor(
    private readonly memory: AgentMemoryManagementService,
    private readonly identity: MemoryOwnerIdentity,
  ) {}

  @Get()
  @ApiMemoryOwnerToken()
  @ApiOperation({ summary: '列出智能体长期记忆' })
  async execute(
    @Param('agentId') agentId: string,
    @Headers('x-memory-owner-token') ownerToken?: string,
  ): Promise<AgentMemorySummary[]> {
    const details = await this.memory.listAgentMemories(
      agentId,
      resolveRequiredMemoryOwnerKey(ownerToken, this.identity),
    );

    return details.map((detail) =>
      toAgentMemorySummary(detail.memory, detail.artifacts),
    );
  }
}
