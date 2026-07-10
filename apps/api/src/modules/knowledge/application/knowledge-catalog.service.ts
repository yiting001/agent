import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { KnowledgeBase, KnowledgeModule } from '../domain/knowledge';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';

@Injectable()
export class KnowledgeCatalogService {
  constructor(private readonly repository: KnowledgeCatalogRepository) {}

  async getBase(id: string): Promise<KnowledgeBase> {
    const knowledgeBase = await this.repository.findBase(id);

    if (!knowledgeBase) {
      throw new ApplicationError('not_found', '知识库不存在。');
    }

    return knowledgeBase;
  }

  async getModule(id: string): Promise<KnowledgeModule> {
    const module = await this.repository.findModule(id);

    if (!module) {
      throw new ApplicationError('not_found', '知识模块不存在。');
    }

    return module;
  }

  async getModules(ids: string[]): Promise<KnowledgeModule[]> {
    const uniqueIds = [...new Set(ids)];
    const modules = await this.repository.findModules(uniqueIds);

    if (modules.length !== uniqueIds.length) {
      throw new ApplicationError('not_found', '部分知识模块不存在。');
    }

    return modules;
  }
}
