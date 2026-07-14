/** 知识库或模块根据其文档聚合出的可用状态。 */
export type KnowledgeResourceStatus =
  | 'empty'
  | 'failed'
  | 'processing'
  | 'ready';

/** 文档从分片上传到向量索引完成的生命周期。 */
export type KnowledgeDocumentStatus =
  | 'failed'
  | 'processing'
  | 'queued'
  | 'ready'
  | 'uploading';

/** 知识库定义及其固定的嵌入模型配置。 */
export interface KnowledgeBase {
  createdAt: Date;
  description: string;
  /** 向量维度必须与嵌入模型输出及 pgvector 集合一致。 */
  embeddingDimensions: number;
  embeddingModel: string;
  embeddingProviderId: string;
  id: string;
  name: string;
  updatedAt: Date;
}

/** 知识库内用于组织文档并绑定到智能体的业务模块。 */
export interface KnowledgeModule {
  createdAt: Date;
  description: string;
  id: string;
  knowledgeBaseId: string;
  name: string;
  updatedAt: Date;
}

/** 上传文档及其索引处理状态。 */
export interface KnowledgeDocument {
  /** 成功写入向量索引的文本块数量。 */
  chunkCount: number;
  createdAt: Date;
  /** 失败时对管理端可见的清洗后错误信息。 */
  errorMessage?: string;
  fileName: string;
  id: string;
  mimeType: string;
  moduleId: string;
  /** 原始文件内容摘要，用于完整性校验和去重判断。 */
  sha256: string;
  sizeBytes: number;
  status: KnowledgeDocumentStatus;
  /** 对象存储端口使用的内部键，不应作为公开下载地址。 */
  storageKey: string;
  updatedAt: Date;
}

/** 管理端文档列表使用的序列化视图。 */
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

/** 文档预览结果；大文件内容可能被截断。 */
export interface KnowledgeDocumentContent {
  content: string;
  fileName: string;
  id: string;
  mimeType: string;
  /** 表示返回内容不是完整原文。 */
  truncated: boolean;
}

/** 管理端展示的知识模块聚合统计。 */
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

/** 管理端展示的知识库、模块及容量统计。 */
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
