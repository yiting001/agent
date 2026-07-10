import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ModelProvidersModule } from '../model-providers/model-providers.module';
import { AgentCatalogService } from './application/agent-catalog.service';
import { AgentConfigurationService } from './application/agent-configuration.service';
import { AgentRepository } from './application/agent.repository';
import { CreateAgentUseCase } from './application/create-agent.use-case';
import { DeleteAgentUseCase } from './application/delete-agent.use-case';
import { ListAgentsUseCase } from './application/list-agents.use-case';
import { UpdateAgentStatusUseCase } from './application/update-agent-status.use-case';
import { UpdateAgentUseCase } from './application/update-agent.use-case';
import { AgentEntity } from './infrastructure/agent.entity';
import { AgentKnowledgeModuleEntity } from './infrastructure/agent-knowledge-module.entity';
import { TypeOrmAgentRepository } from './infrastructure/typeorm-agent.repository';
import { CreateAgentController } from './presentation/http/create-agent.controller';
import { DeleteAgentController } from './presentation/http/delete-agent.controller';
import { ListAgentsController } from './presentation/http/list-agents.controller';
import { UpdateAgentStatusController } from './presentation/http/update-agent-status.controller';
import { UpdateAgentController } from './presentation/http/update-agent.controller';

@Module({
  controllers: [
    CreateAgentController,
    DeleteAgentController,
    ListAgentsController,
    UpdateAgentController,
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
    AgentConfigurationService,
    CreateAgentUseCase,
    DeleteAgentUseCase,
    ListAgentsUseCase,
    UpdateAgentUseCase,
    UpdateAgentStatusUseCase,
    {
      provide: AgentRepository,
      useClass: TypeOrmAgentRepository,
    },
  ],
})
export class AgentsModule {}
