import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryMaintenanceService } from '../../application/agent-memory-maintenance.service';
import {
  type AgentMemoryTaskSummary,
  type AgentMemoryTaskStatus,
  toAgentMemoryTaskSummary,
} from '../../domain/agent-memory-task';
import { requireMemoryOwnerKey } from './memory-owner-key';

function parseTaskStatus(status?: string): AgentMemoryTaskStatus | undefined {
  if (!status) {
    return undefined;
  }

  if (
    status === 'queued' ||
    status === 'processing' ||
    status === 'succeeded' ||
    status === 'dead'
  ) {
    return status;
  }

  throw new BadRequestException('status 必须是有效的情景任务状态。');
}

@ApiTags('agent-memory')
@Controller('agents/:agentId/memory-tasks')
export class ListAgentMemoryTasksController {
  constructor(private readonly maintenance: AgentMemoryMaintenanceService) {}

  @Get()
  @ApiOperation({ summary: '列出 owner 范围内的图片情景任务' })
  async execute(
    @Param('agentId') agentId: string,
    @Query('ownerKey') ownerKey?: string,
    @Query('status') status?: string,
  ): Promise<AgentMemoryTaskSummary[]> {
    const tasks = await this.maintenance.listTasks(
      agentId,
      requireMemoryOwnerKey(ownerKey),
      parseTaskStatus(status),
    );

    return tasks.map(toAgentMemoryTaskSummary);
  }
}
