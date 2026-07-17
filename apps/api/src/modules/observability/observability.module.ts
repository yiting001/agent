import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MemoryOwnerIdentityModule } from '../agent-memory/memory-owner-identity.module';
import { ApiAccessModule } from '../api-access/api-access.module';
import { GetObservabilityDashboardUseCase } from './application/get-observability-dashboard.use-case';
import { ConvertFeedbackToEvaluationCaseUseCase } from './application/convert-feedback-to-evaluation-case.use-case';
import { DecideFeedbackReviewUseCase } from './application/decide-feedback-review.use-case';
import { FeedbackReviewRepository } from './application/feedback-review.repository';
import { GenerationCaptureService } from './application/generation-capture.service';
import { GetObservabilityTraceUseCase } from './application/get-observability-trace.use-case';
import { ListObservabilityTracesUseCase } from './application/list-observability-traces.use-case';
import { ListFeedbackReviewsUseCase } from './application/list-feedback-reviews.use-case';
import { ObservabilityContentCipher } from './application/observability-content-cipher';
import { ObservabilityEventRepository } from './application/observability-event.repository';
import { ObservabilityGenerationRepository } from './application/observability-generation.repository';
import { ObservabilityService } from './application/observability.service';
import { ObservabilityTraceContext } from './application/observability-trace.context';
import { SubmitGenerationFeedbackUseCase } from './application/submit-generation-feedback.use-case';
import { ObservabilityContext } from './infrastructure/observability-context';
import { AesGcmObservabilityContentCipher } from './infrastructure/aes-gcm-observability-content-cipher';
import { ObservabilityContentMigrator } from './infrastructure/observability-content-migrator';
import { ObservabilityFeedbackEntity } from './infrastructure/observability-feedback.entity';
import { ObservabilityGenerationContentEntity } from './infrastructure/observability-generation-content.entity';
import { ObservabilityGenerationEntity } from './infrastructure/observability-generation.entity';
import { ObservabilityEventEntity } from './infrastructure/observability-event.entity';
import { RequestObservabilityInterceptor } from './infrastructure/request-observability.interceptor';
import { TypeOrmObservabilityEventRepository } from './infrastructure/typeorm-observability-event.repository';
import { TypeOrmFeedbackReviewRepository } from './infrastructure/typeorm-feedback-review.repository';
import { TypeOrmObservabilityGenerationRepository } from './infrastructure/typeorm-observability-generation.repository';
import { GetObservabilityDashboardController } from './presentation/http/get-observability-dashboard.controller';
import { ConvertFeedbackToEvaluationCaseController } from './presentation/http/convert-feedback-to-evaluation-case.controller';
import { DecideFeedbackReviewController } from './presentation/http/decide-feedback-review.controller';
import { GetObservabilityTraceController } from './presentation/http/get-observability-trace.controller';
import { ListObservabilityTracesController } from './presentation/http/list-observability-traces.controller';
import { ListFeedbackReviewsController } from './presentation/http/list-feedback-reviews.controller';
import { SubmitGenerationFeedbackController } from './presentation/http/submit-generation-feedback.controller';

@Global()
@Module({
  controllers: [
    GetObservabilityDashboardController,
    GetObservabilityTraceController,
    ListObservabilityTracesController,
    ListFeedbackReviewsController,
    DecideFeedbackReviewController,
    ConvertFeedbackToEvaluationCaseController,
    SubmitGenerationFeedbackController,
  ],
  exports: [
    GenerationCaptureService,
    ObservabilityContentCipher,
    ObservabilityGenerationRepository,
    ObservabilityService,
    ObservabilityTraceContext,
  ],
  imports: [
    ApiAccessModule,
    MemoryOwnerIdentityModule,
    TypeOrmModule.forFeature([
      ObservabilityEventEntity,
      ObservabilityFeedbackEntity,
      ObservabilityGenerationContentEntity,
      ObservabilityGenerationEntity,
    ]),
  ],
  providers: [
    GenerationCaptureService,
    ConvertFeedbackToEvaluationCaseUseCase,
    DecideFeedbackReviewUseCase,
    GetObservabilityDashboardUseCase,
    GetObservabilityTraceUseCase,
    ListObservabilityTracesUseCase,
    ListFeedbackReviewsUseCase,
    ObservabilityContentMigrator,
    ObservabilityContext,
    ObservabilityService,
    SubmitGenerationFeedbackUseCase,
    {
      provide: FeedbackReviewRepository,
      useClass: TypeOrmFeedbackReviewRepository,
    },
    {
      provide: ObservabilityContentCipher,
      useClass: AesGcmObservabilityContentCipher,
    },
    {
      provide: ObservabilityTraceContext,
      useExisting: ObservabilityContext,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestObservabilityInterceptor,
    },
    {
      provide: ObservabilityEventRepository,
      useClass: TypeOrmObservabilityEventRepository,
    },
    {
      provide: ObservabilityGenerationRepository,
      useClass: TypeOrmObservabilityGenerationRepository,
    },
  ],
})
export class ObservabilityModule {}
