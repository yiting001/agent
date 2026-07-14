import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../config/application.config';
import { DependencyHealthProbe } from './application/ports/dependency-health-probe.port';
import { GetHealthStatusUseCase } from './application/use-cases/get-health-status.use-case';
import { GetReadinessStatusUseCase } from './application/use-cases/get-readiness-status.use-case';
import { PostgresRedisHealthProbe } from './infrastructure/postgres-redis-health.probe';
import { SystemClock } from './infrastructure/system-clock';
import { GetHealthController } from './presentation/http/get-health.controller';
import { GetReadinessController } from './presentation/http/get-readiness.controller';

@Module({
  controllers: [GetHealthController, GetReadinessController],
  providers: [
    PostgresRedisHealthProbe,
    SystemClock,
    {
      provide: DependencyHealthProbe,
      useExisting: PostgresRedisHealthProbe,
    },
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
    {
      inject: [DependencyHealthProbe, SystemClock, ConfigService],
      provide: GetReadinessStatusUseCase,
      useFactory: (
        dependencies: DependencyHealthProbe,
        clock: SystemClock,
        configService: ConfigService,
      ): GetReadinessStatusUseCase => {
        const config =
          configService.getOrThrow<ApplicationConfig>('application');

        return new GetReadinessStatusUseCase(
          dependencies,
          clock,
          config.serviceName,
        );
      },
    },
  ],
})
export class HealthModule {}
