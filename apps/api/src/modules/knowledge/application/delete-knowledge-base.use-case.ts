import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { KnowledgeModuleUsage } from './knowledge-module-usage';
import { KnowledgeObjectStorage } from './knowledge-object-storage';
import { VectorIndex } from './vector-index';

@Injectable()
export class DeleteKnowledgeBaseUseCase {
  constructor(
    private readonly catalog: KnowledgeCatalogService,
    private readonly repository: KnowledgeCatalogRepository,
    private readonly moduleUsage: KnowledgeModuleUsage,
    private readonly objectStorage: KnowledgeObjectStorage,
    private readonly vectorIndex: VectorIndex,
  ) {}

  async execute(id: string): Promise<void> {
    const knowledgeBase = await this.catalog.getBase(id);
    const modules = await this.repository.listModules(id);
    const boundAgents = await this.moduleUsage.countBoundAgents(
      modules.map((module) => module.id),
    );

    if (boundAgents > 0) {
      throw new ApplicationError(
        'conflict',
        `知识库中的模块仍被 ${boundAgents} 个智能体使用，请先解绑后再删除。`,
      );
    }

    const documents = (
      await Promise.all(
        modules.map((module) => this.repository.listDocuments(module.id)),
      )
    ).flat();

    await this.objectStorage.deleteMany(
      documents.map((document) => document.storageKey),
    );
    await this.vectorIndex.dropCollection(knowledgeBase);
    await this.repository.deleteBase(id);
  }
}
