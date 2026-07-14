import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { AgentMemoryMaintenanceService } from '../application/agent-memory-maintenance.service';
import { ProcessNextAgentMemoryTaskUseCase } from '../application/process-next-agent-memory-task.use-case';

@Injectable()
export class AgentMemoryTaskScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AgentMemoryTaskScheduler.name);
  private readonly pollIntervalMs: number;
  private readonly reconcileIntervalMs: number;
  private lastReconciledAt = 0;
  private processing = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly processNext: ProcessNextAgentMemoryTaskUseCase,
    private readonly maintenance: AgentMemoryMaintenanceService,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.pollIntervalMs = config.agentMemoryTaskPollIntervalMs;
    this.reconcileIntervalMs = config.agentMemoryReconcileIntervalMs;
  }

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
    void this.tick();
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      try {
        await this.maintenance.reclaimExpired();
      } catch (error) {
        this.logger.error(
          error instanceof Error ? error.message : '情景任务 lease 回收失败。',
        );
      }

      if (Date.now() - this.lastReconciledAt >= this.reconcileIntervalMs) {
        try {
          await this.maintenance.repairAll();
        } catch (error) {
          this.logger.error(
            error instanceof Error ? error.message : '情景记忆巡检失败。',
          );
        } finally {
          this.lastReconciledAt = Date.now();
        }
      }

      while (await this.processNext.execute()) {
        continue;
      }
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error.message : '图片情景任务调度失败。',
      );
    } finally {
      this.processing = false;
    }
  }
}
