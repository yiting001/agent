import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { KnowledgeModuleSummary } from '../domain/knowledge';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';
import { KnowledgeCatalogService } from './knowledge-catalog.service';

export interface UpdateKnowledgeModuleCommand {
  description: string;
  id: string;
  name: string;
}

@Injectable()
export class UpdateKnowledgeModuleUseCase {
  constructor(
    private readonly catalog: KnowledgeCatalogService,
    private readonly repository: KnowledgeCatalogRepository,
  ) {}

  async execute(
    command: UpdateKnowledgeModuleCommand,
  ): Promise<KnowledgeModuleSummary> {
    const module = await this.catalog.getModule(command.id);

    await this.repository.saveModule({
      ...module,
      description: command.description,
      name: command.name,
      updatedAt: new Date(),
    });

    const summaries = await this.repository.list();
    const summary = summaries
      .flatMap((knowledgeBase) => knowledgeBase.modules)
      .find((item) => item.id === command.id);

    if (!summary) {
      throw new ApplicationError('not_found', '知识模块不存在。');
    }

    return summary;
  }
}
