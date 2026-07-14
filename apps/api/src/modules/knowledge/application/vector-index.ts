import type { KnowledgeBase } from '../domain/knowledge';

/** 写入知识向量索引的文档切片。 */
export interface KnowledgeVectorPoint {
  chunkIndex: number;
  content: string;
  documentId: string;
  fileName: string;
  id: string;
  moduleId: string;
  vector: number[];
}

/** 带来源和余弦相似度的知识检索结果。 */
export interface KnowledgeSearchResult {
  content: string;
  documentId: string;
  fileName: string;
  moduleId: string;
  /** 余弦相似度，越接近 1 越相关。 */
  score: number;
}

/** 知识库向量集合生命周期和检索端口。 */
export abstract class VectorIndex {
  /** 仅删除指定知识库范围内的文档向量。 */
  abstract deleteDocuments(
    knowledgeBase: KnowledgeBase,
    documentIds: string[],
  ): Promise<void>;
  /** 清空知识库数据，不要求删除共享维度物理表。 */
  abstract dropCollection(knowledgeBase: KnowledgeBase): Promise<void>;
  /** 并发安全地初始化知识库所需的维度集合。 */
  abstract ensureCollection(knowledgeBase: KnowledgeBase): Promise<void>;
  /** 仅在指定知识库和模块范围内执行近邻检索。 */
  abstract search(
    knowledgeBase: KnowledgeBase,
    moduleIds: string[],
    vector: number[],
    limit: number,
  ): Promise<KnowledgeSearchResult[]>;
  /** 按切片 id 幂等写入或更新。 */
  abstract upsert(
    knowledgeBase: KnowledgeBase,
    points: KnowledgeVectorPoint[],
  ): Promise<void>;
}
