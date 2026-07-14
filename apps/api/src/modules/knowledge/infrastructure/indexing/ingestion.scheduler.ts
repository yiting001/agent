import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../../config/application.config';
import { ProcessNextIngestionJobUseCase } from '../../application/process-next-ingestion-job.use-case';

/** 进程内知识摄取调度器，单 tick 排空当前可领取任务。 */
@Injectable()
export class IngestionScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(IngestionScheduler.name);
  private readonly pollIntervalMs: number;
  private activeTick?: Promise<void>;
  private processing = false;
  private shuttingDown = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly processNext: ProcessNextIngestionJobUseCase,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.pollIntervalMs = config.ingestionPollIntervalMs;
  }

  /** 启动定时轮询，并立即触发首轮处理。 */
  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      this.scheduleTick();
    }, this.pollIntervalMs);
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

  /** 合并重叠的定时触发，避免同一进程重复领取。 */
  private scheduleTick(): void {
    if (this.activeTick || this.shuttingDown) {
      return;
    }

    this.activeTick = this.tick().finally(() => {
      this.activeTick = undefined;
    });
  }

  /** 持续领取任务，直到仓储返回无可用任务。 */
  private async tick(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (await this.processNext.execute()) {
        continue;
      }
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error.message : '文档任务调度失败。',
      );
    } finally {
      this.processing = false;
    }
  }
}
