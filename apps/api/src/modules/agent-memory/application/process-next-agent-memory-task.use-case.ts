import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { AgentEpisodicMemoryService } from './agent-episodic-memory.service';
import { AgentMemoryTaskRepository } from './agent-memory-task.repository';
import { createLockOwner, resolveNextRunAt } from '../domain/agent-memory-task';

@Injectable()
export class ProcessNextAgentMemoryTaskUseCase {
  private readonly backoffBaseMs: number;

  constructor(
    private readonly tasks: AgentMemoryTaskRepository,
    private readonly episodicMemory: AgentEpisodicMemoryService,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.backoffBaseMs = config.agentMemoryTaskBackoffBaseMs;
  }

  async execute(): Promise<boolean> {
    const task = await this.tasks.claimNextTask({
      lockOwner: createLockOwner(),
      now: new Date(),
    });

    if (!task) {
      return false;
    }

    try {
      await this.episodicMemory.processTask(task);
    } catch (error) {
      const dead = task.attempts >= task.maxAttempts;

      await this.episodicMemory.recordTaskFailure({
        dead,
        error,
        nextRunAt: dead
          ? task.nextRunAt
          : resolveNextRunAt({
              attempts: task.attempts,
              baseDelayMs: this.backoffBaseMs,
              now: new Date(),
            }),
        task,
      });
    }

    return true;
  }
}
