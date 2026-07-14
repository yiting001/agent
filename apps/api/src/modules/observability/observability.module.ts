import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GetObservabilityDashboardUseCase } from './application/get-observability-dashboard.use-case';
import { ObservabilityEventRepository } from './application/observability-event.repository';
import { ObservabilityService } from './application/observability.service';
import { ObservabilityContext } from './infrastructure/observability-context';
import { ObservabilityEventEntity } from './infrastructure/observability-event.entity';
import { RequestObservabilityInterceptor } from './infrastructure/request-observability.interceptor';
import { TypeOrmObservabilityEventRepository } from './infrastructure/typeorm-observability-event.repository';
import { GetObservabilityDashboardController } from './presentation/http/get-observability-dashboard.controller';

@Global()
@Module({
  controllers: [GetObservabilityDashboardController],
  exports: [ObservabilityContext, ObservabilityService],
  imports: [TypeOrmModule.forFeature([ObservabilityEventEntity])],
  providers: [
    GetObservabilityDashboardUseCase,
    ObservabilityContext,
    ObservabilityService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestObservabilityInterceptor,
    },
    {
      provide: ObservabilityEventRepository,
      useClass: TypeOrmObservabilityEventRepository,
    },
  ],
})
export class ObservabilityModule {}
