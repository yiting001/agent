export type KnowledgeResourceStatus =
  | 'empty'
  | 'failed'
  | 'processing'
  | 'ready';

export type KnowledgeDocumentStatus =
  | 'failed'
  | 'processing'
  | 'queued'
  | 'ready'
  | 'uploading';

export interface KnowledgeBase {
  createdAt: Date;
  description: string;
  embeddingDimensions: number;
  embeddingModel: string;
  embeddingProviderId: string;
  id: string;
  name: string;
  updatedAt: Date;
}

export interface KnowledgeModule {
  createdAt: Date;
  description: string;
  id: string;
  knowledgeBaseId: string;
  name: string;
  updatedAt: Date;
}

export interface KnowledgeDocument {
  chunkCount: number;
  createdAt: Date;
  errorMessage?: string;
  fileName: string;
  id: string;
  mimeType: string;
  moduleId: string;
  sha256: string;
  sizeBytes: number;
  status: KnowledgeDocumentStatus;
  storageKey: string;
  updatedAt: Date;
}

export interface KnowledgeDocumentSummary {
  chunkCount: number;
  createdAt: string;
  errorMessage?: string;
  fileName: string;
  id: string;
  mimeType: string;
  moduleId: string;
  sizeBytes: number;
  status: KnowledgeDocumentStatus;
  updatedAt: string;
}

export interface KnowledgeDocumentContent {
  content: string;
  fileName: string;
  id: string;
  mimeType: string;
  truncated: boolean;
}

export interface KnowledgeModuleSummary {
  description: string;
  documentCount: number;
  id: string;
  knowledgeBaseId: string;
  name: string;
  sizeBytes: number;
  status: KnowledgeResourceStatus;
  updatedAt: string;
}

export interface KnowledgeBaseSummary {
  description: string;
  documentCount: number;
  embeddingDimensions: number;
  embeddingModel: string;
  embeddingProviderId: string;
  id: string;
  modules: KnowledgeModuleSummary[];
  name: string;
  sizeBytes: number;
  status: KnowledgeResourceStatus;
  updatedAt: string;
}
