import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CreateKnowledgeEntryUseCase } from './application/use-cases/create-knowledge-entry.use-case';
import { DeleteKnowledgeEntryUseCase } from './application/use-cases/delete-knowledge-entry.use-case';
import { GetKnowledgeEntryUseCase } from './application/use-cases/get-knowledge-entry.use-case';
import { ListKnowledgeEntriesUseCase } from './application/use-cases/list-knowledge-entries.use-case';
import { UpdateKnowledgeEntryUseCase } from './application/use-cases/update-knowledge-entry.use-case';
import {
  KNOWLEDGE_ENTRY_REPOSITORY,
  type KnowledgeEntryRepository,
} from './application/ports/knowledge-entry.repository';
import { KnowledgeEntryOrmEntity } from './infrastructure/persistence/knowledge-entry.orm-entity';
import { TypeormKnowledgeEntryRepository } from './infrastructure/persistence/typeorm-knowledge-entry.repository';
import { CreateKnowledgeEntryController } from './presentation/http/create-knowledge-entry.controller';
import { DeleteKnowledgeEntryController } from './presentation/http/delete-knowledge-entry.controller';
import { GetKnowledgeEntryController } from './presentation/http/get-knowledge-entry.controller';
import { ListKnowledgeEntriesController } from './presentation/http/list-knowledge-entries.controller';
import { UpdateKnowledgeEntryController } from './presentation/http/update-knowledge-entry.controller';

/** Builds one use case provider bound to the repository port. */
function useCaseProvider<T>(
  useCase: new (repository: KnowledgeEntryRepository) => T,
): {
  inject: [typeof KNOWLEDGE_ENTRY_REPOSITORY];
  provide: new (repository: KnowledgeEntryRepository) => T;
  useFactory: (repository: KnowledgeEntryRepository) => T;
} {
  return {
    inject: [KNOWLEDGE_ENTRY_REPOSITORY],
    provide: useCase,
    useFactory: (repository: KnowledgeEntryRepository): T =>
      new useCase(repository),
  };
}

@Module({
  controllers: [
    ListKnowledgeEntriesController,
    GetKnowledgeEntryController,
    CreateKnowledgeEntryController,
    UpdateKnowledgeEntryController,
    DeleteKnowledgeEntryController,
  ],
  imports: [TypeOrmModule.forFeature([KnowledgeEntryOrmEntity])],
  providers: [
    {
      provide: KNOWLEDGE_ENTRY_REPOSITORY,
      useClass: TypeormKnowledgeEntryRepository,
    },
    useCaseProvider(CreateKnowledgeEntryUseCase),
    useCaseProvider(DeleteKnowledgeEntryUseCase),
    useCaseProvider(GetKnowledgeEntryUseCase),
    useCaseProvider(ListKnowledgeEntriesUseCase),
    useCaseProvider(UpdateKnowledgeEntryUseCase),
  ],
})
export class KnowledgeModule {}
