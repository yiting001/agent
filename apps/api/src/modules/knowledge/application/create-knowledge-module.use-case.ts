import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { KnowledgeModuleSummary } from '../domain/knowledge';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';
import { KnowledgeCatalogService } from './knowledge-catalog.service';

export interface CreateKnowledgeModuleCommand {
  description: string;
  knowledgeBaseId: string;
  name: string;
}

@Injectable()
export class CreateKnowledgeModuleUseCase {
  constructor(
    private readonly catalog: KnowledgeCatalogService,
    private readonly repository: KnowledgeCatalogRepository,
  ) {}

  async execute(
    command: CreateKnowledgeModuleCommand,
  ): Promise<KnowledgeModuleSummary> {
    await this.catalog.getBase(command.knowledgeBaseId);

    const now = new Date();
    const module = {
      createdAt: now,
      description: command.description,
      id: randomUUID(),
      knowledgeBaseId: command.knowledgeBaseId,
      name: command.name,
      updatedAt: now,
    };

    await this.repository.saveModule(module);

    return {
      description: module.description,
      documentCount: 0,
      id: module.id,
      knowledgeBaseId: module.knowledgeBaseId,
      name: module.name,
      sizeBytes: 0,
      status: 'empty',
      updatedAt: now.toISOString(),
    };
  }
}
