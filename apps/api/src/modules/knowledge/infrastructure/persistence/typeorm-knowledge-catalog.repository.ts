import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { KnowledgeCatalogRepository } from '../../application/knowledge-catalog.repository';
import type {
  KnowledgeBase,
  KnowledgeBaseSummary,
  KnowledgeDocument,
  KnowledgeDocumentStatus,
  KnowledgeModule,
  KnowledgeResourceStatus,
} from '../../domain/knowledge';
import { KnowledgeBaseEntity } from './knowledge-base.entity';
import { KnowledgeDocumentEntity } from './knowledge-document.entity';
import { KnowledgeModuleEntity } from './knowledge-module.entity';

function resourceStatus(
  statuses: KnowledgeDocumentStatus[],
): KnowledgeResourceStatus {
  if (statuses.length === 0) {
    return 'empty';
  }

  if (statuses.some((status) => status === 'failed')) {
    return 'failed';
  }

  if (statuses.some((status) => status !== 'ready')) {
    return 'processing';
  }

  return 'ready';
}

@Injectable()
export class TypeOrmKnowledgeCatalogRepository extends KnowledgeCatalogRepository {
  constructor(
    @InjectRepository(KnowledgeBaseEntity)
    private readonly bases: Repository<KnowledgeBaseEntity>,
    @InjectRepository(KnowledgeModuleEntity)
    private readonly modules: Repository<KnowledgeModuleEntity>,
    @InjectRepository(KnowledgeDocumentEntity)
    private readonly documents: Repository<KnowledgeDocumentEntity>,
  ) {
    super();
  }

  async findBase(id: string): Promise<KnowledgeBase | undefined> {
    const entity = await this.bases.findOneBy({ id });

    return entity ? { ...entity } : undefined;
  }

  async findModule(id: string): Promise<KnowledgeModule | undefined> {
    const entity = await this.modules.findOneBy({ id });

    return entity ? { ...entity } : undefined;
  }

  async findModules(ids: string[]): Promise<KnowledgeModule[]> {
    if (ids.length === 0) {
      return [];
    }

    const entities = await this.modules.findBy({ id: In(ids) });

    return entities.map((entity) => ({ ...entity }));
  }

  async list(): Promise<KnowledgeBaseSummary[]> {
    const [bases, modules, documents] = await Promise.all([
      this.bases.find({ order: { updatedAt: 'DESC' } }),
      this.modules.find(),
      this.documents.find(),
    ]);

    return bases.map((knowledgeBase) => {
      const baseModules = modules.filter(
        (module) => module.knowledgeBaseId === knowledgeBase.id,
      );
      const moduleSummaries = baseModules.map((module) => {
        const moduleDocuments = documents.filter(
          (document) => document.moduleId === module.id,
        );

        return {
          description: module.description,
          documentCount: moduleDocuments.length,
          id: module.id,
          knowledgeBaseId: module.knowledgeBaseId,
          name: module.name,
          sizeBytes: moduleDocuments.reduce(
            (total, document) => total + document.sizeBytes,
            0,
          ),
          status: resourceStatus(
            moduleDocuments.map((document) => document.status),
          ),
          updatedAt: module.updatedAt.toISOString(),
        };
      });

      return {
        description: knowledgeBase.description,
        documentCount: moduleSummaries.reduce(
          (total, module) => total + module.documentCount,
          0,
        ),
        embeddingDimensions: knowledgeBase.embeddingDimensions,
        embeddingModel: knowledgeBase.embeddingModel,
        embeddingProviderId: knowledgeBase.embeddingProviderId,
        id: knowledgeBase.id,
        modules: moduleSummaries,
        name: knowledgeBase.name,
        sizeBytes: moduleSummaries.reduce(
          (total, module) => total + module.sizeBytes,
          0,
        ),
        status: resourceStatus(
          baseModules.flatMap((module) =>
            documents
              .filter((document) => document.moduleId === module.id)
              .map((document) => document.status),
          ),
        ),
        updatedAt: knowledgeBase.updatedAt.toISOString(),
      };
    });
  }

  async saveBase(knowledgeBase: KnowledgeBase): Promise<void> {
    await this.bases.save(knowledgeBase);
  }

  async saveDocument(document: KnowledgeDocument): Promise<void> {
    await this.documents.save(document);
  }

  async saveModule(module: KnowledgeModule): Promise<void> {
    await this.modules.save(module);
    await this.bases.update(module.knowledgeBaseId, {
      updatedAt: module.updatedAt,
    });
  }
}
