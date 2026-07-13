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
import { IngestionJobEntity } from './ingestion-job.entity';
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
    @InjectRepository(IngestionJobEntity)
    private readonly jobs: Repository<IngestionJobEntity>,
  ) {
    super();
  }

  async deleteBase(id: string): Promise<void> {
    const modules = await this.modules.findBy({ knowledgeBaseId: id });

    for (const module of modules) {
      await this.deleteModule(module.id);
    }

    await this.bases.delete({ id });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.jobs.delete({ documentId: id });
    await this.documents.delete({ id });
  }

  async deleteModule(id: string): Promise<void> {
    const documents = await this.documents.findBy({ moduleId: id });

    for (const document of documents) {
      await this.deleteDocument(document.id);
    }

    await this.modules.delete({ id });
  }

  async findBase(id: string): Promise<KnowledgeBase | undefined> {
    const entity = await this.bases.findOneBy({ id });

    return entity ? { ...entity } : undefined;
  }

  async findModule(id: string): Promise<KnowledgeModule | undefined> {
    const entity = await this.modules.findOneBy({ id });

    return entity ? { ...entity } : undefined;
  }

  async findDocument(id: string): Promise<KnowledgeDocument | undefined> {
    const entity = await this.documents.findOneBy({ id });

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

  async listDocuments(moduleId: string): Promise<KnowledgeDocument[]> {
    const entities = await this.documents.find({
      order: { updatedAt: 'DESC' },
      where: { moduleId },
    });

    return entities.map((entity) => ({ ...entity }));
  }

  async listModules(knowledgeBaseId: string): Promise<KnowledgeModule[]> {
    const entities = await this.modules.find({
      order: { createdAt: 'ASC' },
      where: { knowledgeBaseId },
    });

    return entities.map((entity) => ({ ...entity }));
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
