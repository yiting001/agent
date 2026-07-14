import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentsModule } from '../agents/agents.module';
import { ChatAttachmentModule } from '../chat/chat-attachment.module';
import { ModelProvidersModule } from '../model-providers/model-providers.module';
import { AgentEpisodicMemoryService } from './application/agent-episodic-memory.service';
import { AgentMemoryIndex } from './application/agent-memory.index';
import { AgentMemoryManagementService } from './application/agent-memory-management.service';
import { AgentMemoryRepository } from './application/agent-memory.repository';
import { AgentMemoryService } from './application/agent-memory.service';
import { AgentMemoryArtifactEntity } from './infrastructure/agent-memory-artifact.entity';
import { AgentMemoryEntity } from './infrastructure/agent-memory.entity';
import { AgentMemoryMessageEntity } from './infrastructure/agent-memory-message.entity';
import { AgentMemoryThreadEntity } from './infrastructure/agent-memory-thread.entity';
import { TypeOrmAgentMemoryRepository } from './infrastructure/typeorm-agent-memory.repository';
import { ZvecAgentMemoryIndex } from './infrastructure/zvec-agent-memory.index';
import { ClearAgentMemoryController } from './presentation/http/clear-agent-memory.controller';
import { DeleteAgentMemoryController } from './presentation/http/delete-agent-memory.controller';
import { GetAgentMemoryArtifactController } from './presentation/http/get-agent-memory-artifact.controller';
import { ListAgentMemoriesController } from './presentation/http/list-agent-memories.controller';

@Module({
  controllers: [
    ClearAgentMemoryController,
    DeleteAgentMemoryController,
    GetAgentMemoryArtifactController,
    ListAgentMemoriesController,
  ],
  exports: [AgentEpisodicMemoryService, AgentMemoryService],
  imports: [
    AgentsModule,
    ChatAttachmentModule,
    ModelProvidersModule,
    TypeOrmModule.forFeature([
      AgentMemoryArtifactEntity,
      AgentMemoryEntity,
      AgentMemoryMessageEntity,
      AgentMemoryThreadEntity,
    ]),
  ],
  providers: [
    AgentEpisodicMemoryService,
    AgentMemoryManagementService,
    AgentMemoryService,
    {
      provide: AgentMemoryIndex,
      useClass: ZvecAgentMemoryIndex,
    },
    {
      provide: AgentMemoryRepository,
      useClass: TypeOrmAgentMemoryRepository,
    },
  ],
})
export class AgentMemoryModule {}
