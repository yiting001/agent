import { Injectable } from '@nestjs/common';

import type { KnowledgeDocumentSummary } from '../domain/knowledge';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';
import { KnowledgeCatalogService } from './knowledge-catalog.service';

@Injectable()
export class ListModuleDocumentsUseCase {
  constructor(
    private readonly catalog: KnowledgeCatalogService,
    private readonly repository: KnowledgeCatalogRepository,
  ) {}

  async execute(moduleId: string): Promise<KnowledgeDocumentSummary[]> {
    await this.catalog.getModule(moduleId);

    const documents = await this.repository.listDocuments(moduleId);

    return documents.map((document) => ({
      chunkCount: document.chunkCount,
      createdAt: document.createdAt.toISOString(),
      errorMessage: document.errorMessage,
      fileName: document.fileName,
      id: document.id,
      mimeType: document.mimeType,
      moduleId: document.moduleId,
      sizeBytes: document.sizeBytes,
      status: document.status,
      updatedAt: document.updatedAt.toISOString(),
    }));
  }
}
