import type {
  KnowledgeBase,
  KnowledgeBaseSummary,
  KnowledgeDocument,
  KnowledgeModule,
} from '../domain/knowledge';

/** 知识库、模块和文档目录的持久化端口。 */
export abstract class KnowledgeCatalogRepository {
  abstract deleteBase(id: string): Promise<void>;
  abstract deleteDocument(id: string): Promise<void>;
  abstract deleteModule(id: string): Promise<void>;
  abstract findBase(id: string): Promise<KnowledgeBase | undefined>;
  abstract findDocument(id: string): Promise<KnowledgeDocument | undefined>;
  abstract findModule(id: string): Promise<KnowledgeModule | undefined>;
  /** 查询智能体绑定模块时保持输入标识对应的业务集合语义。 */
  abstract findModules(ids: string[]): Promise<KnowledgeModule[]>;
  abstract list(): Promise<KnowledgeBaseSummary[]>;
  abstract listDocuments(moduleId: string): Promise<KnowledgeDocument[]>;
  abstract listModules(knowledgeBaseId: string): Promise<KnowledgeModule[]>;
  abstract saveBase(knowledgeBase: KnowledgeBase): Promise<void>;
  abstract saveDocument(document: KnowledgeDocument): Promise<void>;
  abstract saveModule(module: KnowledgeModule): Promise<void>;
}
