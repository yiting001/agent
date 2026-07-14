import { Controller, Delete, HttpCode, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryService } from '../../application/agent-memory.service';
import { requireMemoryOwnerKey } from './memory-owner-key';

@ApiTags('agent-memory')
@Controller('agents/:agentId/memories/:memoryId')
export class DeleteAgentMemoryController {
  constructor(private readonly memory: AgentMemoryService) {}

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: '删除一条智能体长期记忆' })
  async execute(
    @Param('agentId') agentId: string,
    @Param('memoryId') memoryId: string,
    @Query('ownerKey') ownerKey?: string,
  ): Promise<void> {
    await this.memory.deleteMemory(
      agentId,
      requireMemoryOwnerKey(ownerKey),
      memoryId,
    );
  }
}
