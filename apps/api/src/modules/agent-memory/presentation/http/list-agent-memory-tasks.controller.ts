import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AgentMemoryMaintenanceService } from '../../application/agent-memory-maintenance.service';
import { MemoryOwnerIdentity } from '../../application/memory-owner-identity';
import {
  type AgentMemoryTaskSummary,
  type AgentMemoryTaskStatus,
  toAgentMemoryTaskSummary,
} from '../../domain/agent-memory-task';
import {
  ApiMemoryOwnerToken,
  resolveRequiredMemoryOwnerKey,
} from './resolve-memory-owner-key';

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
  constructor(
    private readonly maintenance: AgentMemoryMaintenanceService,
    private readonly identity: MemoryOwnerIdentity,
  ) {}

  @Get()
  @ApiMemoryOwnerToken()
  @ApiOperation({ summary: '列出 owner 范围内的图片情景任务' })
  async execute(
    @Param('agentId') agentId: string,
    @Headers('x-memory-owner-token') ownerToken: string | undefined,
    @Query('status') status?: string,
  ): Promise<AgentMemoryTaskSummary[]> {
    const tasks = await this.maintenance.listTasks(
      agentId,
      resolveRequiredMemoryOwnerKey(ownerToken, this.identity),
      parseTaskStatus(status),
    );

    return tasks.map(toAgentMemoryTaskSummary);
  }
}
