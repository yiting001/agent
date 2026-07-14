import { Injectable, Logger } from '@nestjs/common';

import { ObservabilityService } from '../../observability/application/observability.service';
import type { AgentMemoryTask } from '../domain/agent-memory-task';

@Injectable()
export class AgentMemoryTaskObservabilityService {
  private readonly logger = new Logger(
    AgentMemoryTaskObservabilityService.name,
  );

  constructor(private readonly observability: ObservabilityService) {}

  async recordFailure(input: {
    dead: boolean;
    errorMessage: string;
    task: AgentMemoryTask;
  }): Promise<void> {
    await this.observability.record({
      agentId: input.task.agentId,
      category: 'tool',
      durationMs: 0,
      errorMessage: input.errorMessage,
      metadata: {
        domain: 'agent-memory',
        kind: input.task.kind,
        memoryId: input.task.memoryId,
        status: input.dead ? 'dead' : 'queued',
      },
      operation: 'agent_memory.task_failure',
      startedAt: new Date(),
      status: 'error',
    });
    this.logger.warn(
      JSON.stringify({
        attempts: input.task.attempts,
        dead: input.dead,
        error: input.errorMessage,
        kind: input.task.kind,
        memoryId: input.task.memoryId,
        operation: 'agent_memory.task_failure',
        taskId: input.task.id,
      }),
    );
  }

  async recordSuccess(task: AgentMemoryTask): Promise<void> {
    await this.observability.record({
      agentId: task.agentId,
      category: 'tool',
      durationMs: 0,
      metadata: {
        attempts: task.attempts,
        domain: 'agent-memory',
        kind: task.kind,
        memoryId: task.memoryId,
      },
      operation: 'agent_memory.task_succeeded',
      startedAt: new Date(),
      status: 'ok',
    });
  }
}
