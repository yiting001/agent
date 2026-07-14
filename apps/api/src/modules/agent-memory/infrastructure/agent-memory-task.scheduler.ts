import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { AgentMemoryMaintenanceService } from '../application/agent-memory-maintenance.service';
import { AgentMemoryTaskDispatcher } from '../application/agent-memory-task.dispatcher';
import { ProcessNextAgentMemoryTaskUseCase } from '../application/process-next-agent-memory-task.use-case';

/**
 * 进程内情景记忆任务调度器。
 * activeTick 和 processing 共同避免定时器、主动 dispatch 并发重入。
 */
@Injectable()
export class AgentMemoryTaskScheduler
  extends AgentMemoryTaskDispatcher
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AgentMemoryTaskScheduler.name);
  private readonly pollIntervalMs: number;
  private readonly reconcileIntervalMs: number;
  private activeTick?: Promise<void>;
  private lastReconciledAt = 0;
  private processing = false;
  private shuttingDown = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly processNext: ProcessNextAgentMemoryTaskUseCase,
    private readonly maintenance: AgentMemoryMaintenanceService,
    configService: ConfigService,
  ) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.pollIntervalMs = config.agentMemoryTaskPollIntervalMs;
    this.reconcileIntervalMs = config.agentMemoryReconcileIntervalMs;
  }

  /** 启动定时轮询，并立即触发首轮处理。 */
  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      this.scheduleTick();
    }, this.pollIntervalMs);
    this.scheduleTick();
  }

  /** 新任务提交后尝试提前唤醒调度器。 */
  dispatch(): void {
    this.scheduleTick();
  }

  /** 停止创建新 tick，并等待当前处理安全结束。 */
  async onApplicationShutdown(): Promise<void> {
    this.shuttingDown = true;

    if (this.timer) {
      clearInterval(this.timer);
    }

    await this.activeTick;
  }

  /** 合并并发唤醒请求，确保同一时刻只有一个 activeTick。 */
  private scheduleTick(): void {
    if (this.activeTick || this.shuttingDown) {
      return;
    }

    this.activeTick = this.tick().finally(() => {
      this.activeTick = undefined;
    });
  }

  /** 先回收租约和周期巡检，再持续处理任务直到队列为空。 */
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
