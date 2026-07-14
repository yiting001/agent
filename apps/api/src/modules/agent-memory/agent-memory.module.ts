import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentsModule } from '../agents/agents.module';
import { ChatAttachmentModule } from '../chat/chat-attachment.module';
import { ModelProvidersModule } from '../model-providers/model-providers.module';
import { AgentEpisodicMemoryService } from './application/agent-episodic-memory.service';
import { AgentMemoryIndex } from './application/agent-memory.index';
import { AgentMemoryMaintenanceService } from './application/agent-memory-maintenance.service';
import { AgentMemoryManagementService } from './application/agent-memory-management.service';
import { AgentMemoryRepository } from './application/agent-memory.repository';
import { AgentMemoryService } from './application/agent-memory.service';
import { AgentMemoryTaskDispatcher } from './application/agent-memory-task.dispatcher';
import { AgentMemoryTaskRepository } from './application/agent-memory-task.repository';
import { AgentMemoryTaskObservabilityService } from './application/agent-memory-task-observability.service';
import { ProcessNextAgentMemoryTaskUseCase } from './application/process-next-agent-memory-task.use-case';
import { AgentMemoryArtifactEntity } from './infrastructure/agent-memory-artifact.entity';
import { AgentMemoryTaskScheduler } from './infrastructure/agent-memory-task.scheduler';
import { AgentMemoryTaskEntity } from './infrastructure/agent-memory-task.entity';
import { AgentMemoryEntity } from './infrastructure/agent-memory.entity';
import { AgentMemoryMessageEntity } from './infrastructure/agent-memory-message.entity';
import { AgentMemoryThreadEntity } from './infrastructure/agent-memory-thread.entity';
import { TypeOrmAgentMemoryRepository } from './infrastructure/typeorm-agent-memory.repository';
import { TypeOrmAgentMemoryTaskMaintenanceStore } from './infrastructure/typeorm-agent-memory-task-maintenance.store';
import { TypeOrmAgentMemoryTaskRepository } from './infrastructure/typeorm-agent-memory-task.repository';
import { PgvectorAgentMemoryIndex } from './infrastructure/pgvector-agent-memory.index';
import { ClearAgentMemoryController } from './presentation/http/clear-agent-memory.controller';
import { DeleteAgentMemoryController } from './presentation/http/delete-agent-memory.controller';
import { GetAgentMemoryArtifactController } from './presentation/http/get-agent-memory-artifact.controller';
import { ListAgentMemoriesController } from './presentation/http/list-agent-memories.controller';
import { ListAgentMemoryTasksController } from './presentation/http/list-agent-memory-tasks.controller';
import { RecoverAgentMemoryTasksController } from './presentation/http/recover-agent-memory-tasks.controller';
import { RetryAgentMemoryController } from './presentation/http/retry-agent-memory.controller';
import { GetAgentMemoryHealthController } from './presentation/http/get-agent-memory-health.controller';
import { MemoryOwnerIdentityModule } from './memory-owner-identity.module';

@Module({
  controllers: [
    ClearAgentMemoryController,
    DeleteAgentMemoryController,
    GetAgentMemoryArtifactController,
    GetAgentMemoryHealthController,
    ListAgentMemoriesController,
    ListAgentMemoryTasksController,
    RecoverAgentMemoryTasksController,
    RetryAgentMemoryController,
  ],
  exports: [
    AgentEpisodicMemoryService,
    AgentMemoryService,
    AgentMemoryTaskDispatcher,
    ProcessNextAgentMemoryTaskUseCase,
  ],
  imports: [
    AgentsModule,
    ChatAttachmentModule,
    MemoryOwnerIdentityModule,
    ModelProvidersModule,
    TypeOrmModule.forFeature([
      AgentMemoryArtifactEntity,
      AgentMemoryEntity,
      AgentMemoryMessageEntity,
      AgentMemoryTaskEntity,
      AgentMemoryThreadEntity,
    ]),
  ],
  providers: [
    AgentEpisodicMemoryService,
    AgentMemoryMaintenanceService,
    AgentMemoryManagementService,
    AgentMemoryService,
    AgentMemoryTaskScheduler,
    AgentMemoryTaskObservabilityService,
    TypeOrmAgentMemoryTaskMaintenanceStore,
    ProcessNextAgentMemoryTaskUseCase,
    {
      provide: AgentMemoryTaskDispatcher,
      useExisting: AgentMemoryTaskScheduler,
    },
    {
      provide: AgentMemoryIndex,
      useClass: PgvectorAgentMemoryIndex,
    },
    {
      provide: AgentMemoryRepository,
      useClass: TypeOrmAgentMemoryRepository,
    },
    {
      provide: AgentMemoryTaskRepository,
      useClass: TypeOrmAgentMemoryTaskRepository,
    },
  ],
})
export class AgentMemoryModule {}
