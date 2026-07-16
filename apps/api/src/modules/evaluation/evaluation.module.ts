import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentsModule } from '../agents/agents.module';
import { ChatModule } from '../chat/chat.module';
import { CreateEvaluationSuiteUseCase } from './application/create-evaluation-suite.use-case';
import { EvaluationAgentGateway } from './application/evaluation-agent.gateway';
import { EvaluationRepository } from './application/evaluation.repository';
import { GetEvaluationRunUseCase } from './application/get-evaluation-run.use-case';
import { ListEvaluationRunsUseCase } from './application/list-evaluation-runs.use-case';
import { ListEvaluationSuitesUseCase } from './application/list-evaluation-suites.use-case';
import { RunEvaluationSuiteUseCase } from './application/run-evaluation-suite.use-case';
import { EvaluationCaseEntity } from './infrastructure/evaluation-case.entity';
import { EvaluationCaseResultEntity } from './infrastructure/evaluation-case-result.entity';
import { ChatEvaluationAgentGateway } from './infrastructure/chat-evaluation-agent.gateway';
import { EvaluationMetricEntity } from './infrastructure/evaluation-metric.entity';
import { EvaluationRunEntity } from './infrastructure/evaluation-run.entity';
import { EvaluationSuiteEntity } from './infrastructure/evaluation-suite.entity';
import { TypeOrmEvaluationRepository } from './infrastructure/typeorm-evaluation.repository';
import { CreateEvaluationSuiteController } from './presentation/http/create-evaluation-suite.controller';
import { GetEvaluationRunController } from './presentation/http/get-evaluation-run.controller';
import { ListEvaluationRunsController } from './presentation/http/list-evaluation-runs.controller';
import { ListEvaluationSuitesController } from './presentation/http/list-evaluation-suites.controller';
import { RunEvaluationSuiteController } from './presentation/http/run-evaluation-suite.controller';

@Module({
  controllers: [
    CreateEvaluationSuiteController,
    GetEvaluationRunController,
    ListEvaluationRunsController,
    ListEvaluationSuitesController,
    RunEvaluationSuiteController,
  ],
  imports: [
    TypeOrmModule.forFeature([
      EvaluationCaseEntity,
      EvaluationCaseResultEntity,
      EvaluationMetricEntity,
      EvaluationRunEntity,
      EvaluationSuiteEntity,
    ]),
    AgentsModule,
    ChatModule,
  ],
  providers: [
    CreateEvaluationSuiteUseCase,
    GetEvaluationRunUseCase,
    ListEvaluationRunsUseCase,
    ListEvaluationSuitesUseCase,
    RunEvaluationSuiteUseCase,
    {
      provide: EvaluationAgentGateway,
      useClass: ChatEvaluationAgentGateway,
    },
    {
      provide: EvaluationRepository,
      useClass: TypeOrmEvaluationRepository,
    },
  ],
})
export class EvaluationModule {}
