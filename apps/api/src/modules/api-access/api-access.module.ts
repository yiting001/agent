import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentsModule } from '../agents/agents.module';
import { ApiApplicationRepository } from './application/api-application.repository';
import { ApiKeyAuthenticatorService } from './application/api-key-authenticator.service';
import { CreateApiApplicationUseCase } from './application/create-api-application.use-case';
import { ListApiApplicationsUseCase } from './application/list-api-applications.use-case';
import { ApiApplicationEntity } from './infrastructure/api-application.entity';
import { TypeOrmApiApplicationRepository } from './infrastructure/typeorm-api-application.repository';
import { CreateApiApplicationController } from './presentation/http/create-api-application.controller';
import { ListApiApplicationsController } from './presentation/http/list-api-applications.controller';

@Module({
  controllers: [CreateApiApplicationController, ListApiApplicationsController],
  exports: [ApiApplicationRepository, ApiKeyAuthenticatorService],
  imports: [AgentsModule, TypeOrmModule.forFeature([ApiApplicationEntity])],
  providers: [
    ApiKeyAuthenticatorService,
    CreateApiApplicationUseCase,
    ListApiApplicationsUseCase,
    {
      provide: ApiApplicationRepository,
      useClass: TypeOrmApiApplicationRepository,
    },
  ],
})
export class ApiAccessModule {}
