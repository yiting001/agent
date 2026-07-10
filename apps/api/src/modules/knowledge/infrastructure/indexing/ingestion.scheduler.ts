import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../../config/application.config';
import { ProcessNextIngestionJobUseCase } from '../../application/process-next-ingestion-job.use-case';

@Injectable()
export class IngestionScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(IngestionScheduler.name);
  private readonly pollIntervalMs: number;
  private processing = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly processNext: ProcessNextIngestionJobUseCase,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.pollIntervalMs = config.ingestionPollIntervalMs;
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
