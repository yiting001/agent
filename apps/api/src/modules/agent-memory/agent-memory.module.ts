import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentMemoryRepository } from './application/agent-memory.repository';
import { AgentMemoryService } from './application/agent-memory.service';
import { AgentMemoryEntity } from './infrastructure/agent-memory.entity';
import { AgentMemoryMessageEntity } from './infrastructure/agent-memory-message.entity';
import { AgentMemoryThreadEntity } from './infrastructure/agent-memory-thread.entity';
import { TypeOrmAgentMemoryRepository } from './infrastructure/typeorm-agent-memory.repository';
import { ClearAgentMemoryController } from './presentation/http/clear-agent-memory.controller';
import { DeleteAgentMemoryController } from './presentation/http/delete-agent-memory.controller';
import { ListAgentMemoriesController } from './presentation/http/list-agent-memories.controller';

@Module({
  controllers: [
    ClearAgentMemoryController,
    DeleteAgentMemoryController,
    ListAgentMemoriesController,
  ],
  exports: [AgentMemoryService],
  imports: [
    TypeOrmModule.forFeature([
      AgentMemoryEntity,
      AgentMemoryMessageEntity,
      AgentMemoryThreadEntity,
    ]),
  ],
  providers: [
    AgentMemoryService,
    {
      provide: AgentMemoryRepository,
      useClass: TypeOrmAgentMemoryRepository,
    },
  ],
})
export class AgentMemoryModule {}
