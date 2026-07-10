import type {
  KnowledgeBase,
  KnowledgeBaseSummary,
  KnowledgeDocument,
  KnowledgeModule,
} from '../domain/knowledge';

export abstract class KnowledgeCatalogRepository {
  abstract findBase(id: string): Promise<KnowledgeBase | undefined>;
  abstract findModule(id: string): Promise<KnowledgeModule | undefined>;
  abstract findModules(ids: string[]): Promise<KnowledgeModule[]>;
  abstract list(): Promise<KnowledgeBaseSummary[]>;
  abstract saveBase(knowledgeBase: KnowledgeBase): Promise<void>;
  abstract saveDocument(document: KnowledgeDocument): Promise<void>;
  abstract saveModule(module: KnowledgeModule): Promise<void>;
}
