import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GetObservabilityDashboardUseCase } from './application/get-observability-dashboard.use-case';
import { GetObservabilityTraceUseCase } from './application/get-observability-trace.use-case';
import { ListObservabilityTracesUseCase } from './application/list-observability-traces.use-case';
import { ObservabilityEventRepository } from './application/observability-event.repository';
import { ObservabilityService } from './application/observability.service';
import { ObservabilityContext } from './infrastructure/observability-context';
import { ObservabilityEventEntity } from './infrastructure/observability-event.entity';
import { RequestObservabilityInterceptor } from './infrastructure/request-observability.interceptor';
import { TypeOrmObservabilityEventRepository } from './infrastructure/typeorm-observability-event.repository';
import { GetObservabilityDashboardController } from './presentation/http/get-observability-dashboard.controller';
import { GetObservabilityTraceController } from './presentation/http/get-observability-trace.controller';
import { ListObservabilityTracesController } from './presentation/http/list-observability-traces.controller';

@Global()
@Module({
  controllers: [
    GetObservabilityDashboardController,
    GetObservabilityTraceController,
    ListObservabilityTracesController,
  ],
  exports: [ObservabilityContext, ObservabilityService],
  imports: [TypeOrmModule.forFeature([ObservabilityEventEntity])],
  providers: [
    GetObservabilityDashboardUseCase,
    GetObservabilityTraceUseCase,
    ListObservabilityTracesUseCase,
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
