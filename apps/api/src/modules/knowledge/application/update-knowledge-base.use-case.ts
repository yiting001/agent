import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { KnowledgeBaseSummary } from '../domain/knowledge';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';
import { KnowledgeCatalogService } from './knowledge-catalog.service';

export interface UpdateKnowledgeBaseCommand {
  description: string;
  id: string;
  name: string;
}

@Injectable()
export class UpdateKnowledgeBaseUseCase {
  constructor(
    private readonly catalog: KnowledgeCatalogService,
    private readonly repository: KnowledgeCatalogRepository,
  ) {}

  async execute(
    command: UpdateKnowledgeBaseCommand,
  ): Promise<KnowledgeBaseSummary> {
    const knowledgeBase = await this.catalog.getBase(command.id);

    await this.repository.saveBase({
      ...knowledgeBase,
      description: command.description,
      name: command.name,
      updatedAt: new Date(),
    });

    const summaries = await this.repository.list();
    const summary = summaries.find((item) => item.id === command.id);

    if (!summary) {
      throw new ApplicationError('not_found', '知识库不存在。');
    }

    return summary;
  }
}
