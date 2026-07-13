import type { KnowledgeBase } from '../domain/knowledge';

export interface KnowledgeVectorPoint {
  chunkIndex: number;
  content: string;
  documentId: string;
  fileName: string;
  id: string;
  moduleId: string;
  vector: number[];
}

export interface KnowledgeSearchResult {
  content: string;
  documentId: string;
  fileName: string;
  moduleId: string;
  score: number;
}

export abstract class VectorIndex {
  abstract deleteDocuments(
    knowledgeBase: KnowledgeBase,
    documentIds: string[],
  ): Promise<void>;
  abstract dropCollection(knowledgeBase: KnowledgeBase): Promise<void>;
  abstract ensureCollection(knowledgeBase: KnowledgeBase): Promise<void>;
  abstract search(
    knowledgeBase: KnowledgeBase,
    moduleIds: string[],
    vector: number[],
    limit: number,
  ): Promise<KnowledgeSearchResult[]>;
  abstract upsert(
    knowledgeBase: KnowledgeBase,
    points: KnowledgeVectorPoint[],
  ): Promise<void>;
}
