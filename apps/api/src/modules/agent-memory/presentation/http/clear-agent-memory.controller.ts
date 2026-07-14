import { Controller, Delete, HttpCode, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryManagementService } from '../../application/agent-memory-management.service';
import { requireMemoryOwnerKey } from './memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memories')
export class ClearAgentMemoryController {
  constructor(private readonly memory: AgentMemoryManagementService) {}

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: '清空 owner 的短期和长期记忆' })
  async execute(
    @Param('agentId') agentId: string,
    @Query('ownerKey') ownerKey?: string,
  ): Promise<void> {
    await this.memory.clearAgentMemory(
      agentId,
      requireMemoryOwnerKey(ownerKey),
    );
  }
}
