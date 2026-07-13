import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { KnowledgeModuleUsage } from './knowledge-module-usage';
import { KnowledgeObjectStorage } from './knowledge-object-storage';
import { VectorIndex } from './vector-index';

@Injectable()
export class DeleteKnowledgeModuleUseCase {
  constructor(
    private readonly catalog: KnowledgeCatalogService,
    private readonly repository: KnowledgeCatalogRepository,
    private readonly moduleUsage: KnowledgeModuleUsage,
    private readonly objectStorage: KnowledgeObjectStorage,
    private readonly vectorIndex: VectorIndex,
  ) {}

  async execute(id: string): Promise<void> {
    const module = await this.catalog.getModule(id);
    const boundAgents = await this.moduleUsage.countBoundAgents([id]);

    if (boundAgents > 0) {
      throw new ApplicationError(
        'conflict',
        `知识模块仍被 ${boundAgents} 个智能体使用，请先解绑后再删除。`,
      );
    }

    const knowledgeBase = await this.catalog.getBase(module.knowledgeBaseId);
    const documents = await this.repository.listDocuments(id);

    await this.objectStorage.deleteMany(
      documents.map((document) => document.storageKey),
    );
    await this.vectorIndex.deleteDocuments(
      knowledgeBase,
      documents.map((document) => document.id),
    );
    await this.repository.deleteModule(id);
  }
}
