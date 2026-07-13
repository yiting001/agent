import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { KnowledgeObjectStorage } from './knowledge-object-storage';
import { VectorIndex } from './vector-index';

@Injectable()
export class DeleteKnowledgeDocumentUseCase {
  constructor(
    private readonly catalog: KnowledgeCatalogService,
    private readonly repository: KnowledgeCatalogRepository,
    private readonly objectStorage: KnowledgeObjectStorage,
    private readonly vectorIndex: VectorIndex,
  ) {}

  async execute(id: string): Promise<void> {
    const document = await this.repository.findDocument(id);

    if (!document) {
      throw new ApplicationError('not_found', '知识文档不存在。');
    }

    const module = await this.catalog.getModule(document.moduleId);
    const knowledgeBase = await this.catalog.getBase(module.knowledgeBaseId);

    await this.objectStorage.deleteMany([document.storageKey]);
    await this.vectorIndex.deleteDocuments(knowledgeBase, [document.id]);
    await this.repository.deleteDocument(id);
  }
}
