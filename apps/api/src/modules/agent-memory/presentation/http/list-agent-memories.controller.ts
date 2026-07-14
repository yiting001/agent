import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryService } from '../../application/agent-memory.service';
import {
  type AgentMemorySummary,
  toAgentMemorySummary,
} from '../../domain/agent-memory';
import { requireMemoryOwnerKey } from './memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memories')
export class ListAgentMemoriesController {
  constructor(private readonly memory: AgentMemoryService) {}

  @Get()
  @ApiOperation({ summary: '列出智能体长期记忆' })
  async execute(
    @Param('agentId') agentId: string,
    @Query('ownerKey') ownerKey?: string,
  ): Promise<AgentMemorySummary[]> {
    const memories = await this.memory.listAgentMemories(
      agentId,
      requireMemoryOwnerKey(ownerKey),
    );

    return memories.map(toAgentMemorySummary);
  }
}
