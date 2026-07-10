import { Injectable } from '@nestjs/common';

import type { KnowledgeBaseSummary } from '../domain/knowledge';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';

@Injectable()
export class ListKnowledgeBasesUseCase {
  constructor(private readonly repository: KnowledgeCatalogRepository) {}

  execute(): Promise<KnowledgeBaseSummary[]> {
    return this.repository.list();
  }
}
