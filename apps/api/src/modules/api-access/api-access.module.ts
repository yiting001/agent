import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentsModule } from '../agents/agents.module';
import { ApiApplicationRepository } from './application/api-application.repository';
import {
  ApiRateLimiter,
  ApiRateLimitPolicyProvider,
} from './application/api-rate-limiter';
import { ApiKeyAuthenticatorService } from './application/api-key-authenticator.service';
import { CreateApiApplicationUseCase } from './application/create-api-application.use-case';
import { EnforceApiRateLimitService } from './application/enforce-api-rate-limit.service';
import { ListApiApplicationsUseCase } from './application/list-api-applications.use-case';
import { ApiApplicationEntity } from './infrastructure/api-application.entity';
import { ConfigApiRateLimitPolicyProvider } from './infrastructure/config-api-rate-limit-policy.provider';
import { RedisApiRateLimiter } from './infrastructure/redis-api-rate-limiter';
import { TypeOrmApiApplicationRepository } from './infrastructure/typeorm-api-application.repository';
import { CreateApiApplicationController } from './presentation/http/create-api-application.controller';
import { ListApiApplicationsController } from './presentation/http/list-api-applications.controller';

@Module({
  controllers: [CreateApiApplicationController, ListApiApplicationsController],
  exports: [
    ApiApplicationRepository,
    ApiKeyAuthenticatorService,
    EnforceApiRateLimitService,
  ],
  imports: [AgentsModule, TypeOrmModule.forFeature([ApiApplicationEntity])],
  providers: [
    ApiKeyAuthenticatorService,
    CreateApiApplicationUseCase,
    EnforceApiRateLimitService,
    ListApiApplicationsUseCase,
    {
      provide: ApiRateLimiter,
      useClass: RedisApiRateLimiter,
    },
    {
      provide: ApiRateLimitPolicyProvider,
      useClass: ConfigApiRateLimitPolicyProvider,
    },
    {
      provide: ApiApplicationRepository,
      useClass: TypeOrmApiApplicationRepository,
    },
  ],
})
export class ApiAccessModule {}
