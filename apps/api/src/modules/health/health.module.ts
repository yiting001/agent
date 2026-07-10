import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../config/application.config';
import { GetHealthStatusUseCase } from './application/use-cases/get-health-status.use-case';
import { SystemClock } from './infrastructure/system-clock';
import { GetHealthController } from './presentation/http/get-health.controller';

@Module({
  controllers: [GetHealthController],
  providers: [
    SystemClock,
    {
      inject: [SystemClock, ConfigService],
      provide: GetHealthStatusUseCase,
      useFactory: (
        clock: SystemClock,
        configService: ConfigService,
      ): GetHealthStatusUseCase => {
        const config =
          configService.getOrThrow<ApplicationConfig>('application');

        return new GetHealthStatusUseCase(clock, config.serviceName);
      },
    },
  ],
})
export class HealthModule {}
