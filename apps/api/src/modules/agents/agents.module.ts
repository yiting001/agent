import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ModelProvidersModule } from '../model-providers/model-providers.module';
import { AgentCatalogService } from './application/agent-catalog.service';
import { AgentRepository } from './application/agent.repository';
import { CreateAgentUseCase } from './application/create-agent.use-case';
import { ListAgentsUseCase } from './application/list-agents.use-case';
import { ListPublishedAgentsUseCase } from './application/list-published-agents.use-case';
import { UpdateAgentStatusUseCase } from './application/update-agent-status.use-case';
import { AgentEntity } from './infrastructure/agent.entity';
import { AgentKnowledgeModuleEntity } from './infrastructure/agent-knowledge-module.entity';
import { TypeOrmAgentRepository } from './infrastructure/typeorm-agent.repository';
import { CreateAgentController } from './presentation/http/create-agent.controller';
import { ListAgentsController } from './presentation/http/list-agents.controller';
import { ListPublishedAgentsController } from './presentation/http/list-published-agents.controller';
import { UpdateAgentStatusController } from './presentation/http/update-agent-status.controller';

@Module({
  controllers: [
    CreateAgentController,
    ListAgentsController,
    ListPublishedAgentsController,
    UpdateAgentStatusController,
  ],
  exports: [AgentCatalogService, AgentRepository],
  imports: [
    TypeOrmModule.forFeature([AgentEntity, AgentKnowledgeModuleEntity]),
    KnowledgeModule,
    ModelProvidersModule,
  ],
  providers: [
    AgentCatalogService,
    CreateAgentUseCase,
    ListAgentsUseCase,
    ListPublishedAgentsUseCase,
    UpdateAgentStatusUseCase,
    {
      provide: AgentRepository,
      useClass: TypeOrmAgentRepository,
    },
  ],
})
export class AgentsModule {}
