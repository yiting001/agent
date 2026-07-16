/** 管理端展示和变更的智能体生命周期。 */
export type AgentStatus = 'disabled' | 'draft' | 'published';
/** 管理工作台中资源的聚合状态。 */
export type ResourceStatus =
  | 'disabled'
  | 'empty'
  | 'failed'
  | 'processing'
  | 'ready';

/** 管理端支持的技能运行方式。 */
export type SkillType = 'mcp' | 'prompt';

/** MCP Server 暴露的单个工具契约。 */
export interface SkillTool {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
}

/** 技能列表与编辑页共享的序列化视图。 */
export interface SkillSummary {
  content: string;
  createdAt: string;
  description: string;
  enabled: boolean;
  endpoint: string;
  id: string;
  name: string;
  tools: SkillTool[];
  type: SkillType;
  updatedAt: string;
}

/** 安装 prompt 或 MCP 技能的输入。 */
export interface InstallSkillInput {
  content: string;
  description: string;
  endpoint: string;
  /** MCP 鉴权头，仅提交给服务端保存，不在摘要中返回。 */
  headers: Record<string, string>;
  name: string;
  type: SkillType;
}

/** 更新技能配置的输入。 */
export interface UpdateSkillInput {
  content: string;
  description: string;
  enabled: boolean;
  endpoint: string;
  /** 缺省表示保持已有 MCP 鉴权头不变。 */
  headers?: Record<string, string>;
  name: string;
}

/** 智能体列表、编辑和聊天入口共享的管理端视图。 */
export interface AgentSummary {
  conversationCount: number;
  description: string;
  id: string;
  moduleIds: string[];
  name: string;
  providerId: string;
  skillIds: string[];
  status: AgentStatus;
  systemPrompt: string;
  temperature: number;
  updatedAt: string;
}

/** 管理端展示的知识文档生命周期。 */
export type KnowledgeDocumentStatus =
  | 'failed'
  | 'processing'
  | 'queued'
  | 'ready'
  | 'uploading';

/** 文档预览结果。 */
export interface KnowledgeDocumentContent {
  content: string;
  fileName: string;
  id: string;
  mimeType: string;
  /** 大文件只返回受配置限制的前缀内容。 */
  truncated: boolean;
}

/** 知识模块文档列表项。 */
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

/** 更新知识库或模块名称、描述的输入。 */
export interface UpdateKnowledgeResourceInput {
  description: string;
  id: string;
  name: string;
}

/** 知识模块及其文档聚合统计。 */
export interface KnowledgeModuleSummary {
  description: string;
  documentCount: number;
  id: string;
  knowledgeBaseId: string;
  name: string;
  sizeBytes: number;
  status: Exclude<ResourceStatus, 'disabled'>;
  updatedAt: string;
}

/** 知识库、嵌入配置和模块集合的管理端视图。 */
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
  status: Exclude<ResourceStatus, 'disabled'>;
  updatedAt: string;
}

/** 不包含密钥明文或密文的模型供应商视图。 */
export interface ModelProviderSummary {
  baseUrl: string;
  chatInputCostPerMillionTokens?: number;
  chatModel?: string;
  chatOutputCostPerMillionTokens?: number;
  /** 表示已保存凭证，不代表上游服务当前可用。 */
  configured: boolean;
  description: string;
  embeddingDimensions?: number;
  embeddingInputCostPerMillionTokens?: number;
  embeddingModel?: string;
  enabled: boolean;
  id: string;
  key: string;
  name: string;
  updatedAt: string;
}

/** API 应用列表及创建结果。 */
export interface ApiApplicationSummary {
  agentId: string;
  createdAt: string;
  endpoint: string;
  id: string;
  maskedKey: string;
  name: string;
  requestCount: number;
  /** 仅创建成功时返回一次，页面离开后不可再次获取。 */
  secretKey?: string;
  status: 'disabled' | 'ready';
}

/** 创建或更新智能体的表单输入。 */
export interface CreateAgentInput {
  description: string;
  moduleIds: string[];
  name: string;
  providerId: string;
  skillIds: string[];
  systemPrompt: string;
  temperature: number;
}

/** 创建知识库的表单输入。 */
export interface CreateKnowledgeBaseInput {
  description: string;
  embeddingProviderId: string;
  name: string;
}

/** 创建知识模块的表单输入。 */
export interface CreateKnowledgeModuleInput {
  description: string;
  knowledgeBaseId: string;
  name: string;
}

/** 配置模型供应商的敏感表单输入。 */
export interface ConfigureProviderInput {
  /** 仅发送到 API，前端不得持久化到 Pinia 或浏览器存储。 */
  apiKey: string;
  baseUrl: string;
  chatInputCostPerMillionTokens?: number;
  chatModel?: string;
  chatOutputCostPerMillionTokens?: number;
  description: string;
  embeddingDimensions?: number;
  embeddingInputCostPerMillionTokens?: number;
  embeddingModel?: string;
  key: string;
  name: string;
}

/** 创建绑定到单个智能体的 API 应用。 */
export interface CreateApiApplicationInput {
  agentId: string;
  name: string;
}

/** 聊天附件上传后的服务端引用。 */
export interface ChatAttachmentSummary {
  fileName: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
}

/** 管理端聊天消息。 */
export interface ConversationMessage {
  attachments?: ChatAttachmentSummary[];
  content: string;
  role: 'assistant' | 'user';
}

/** 管理端聊天完成结果。 */
export interface AgentChatResponse {
  agentId: string;
  answer: string;
  citations: Array<{
    documentId: string;
    fileName: string;
    moduleId: string;
    score: number;
  }>;
  conversationId?: string;
  generationId: string;
  traceId: string;
}

export type GenerationFeedbackReason =
  | 'citation'
  | 'format'
  | 'incorrect'
  | 'irrelevant'
  | 'model'
  | 'other';

export interface GenerationFeedback {
  comment?: string;
  createdAt: string;
  id: string;
  metric: 'helpfulness';
  rating: 'negative' | 'positive';
  reasonCodes: GenerationFeedbackReason[];
  source: 'end_user';
  updatedAt: string;
}

export interface SubmitGenerationFeedbackInput {
  agentId: string;
  comment?: string;
  generationId: string;
  memoryOwnerToken: string;
  rating: GenerationFeedback['rating'];
  reasonCodes: GenerationFeedbackReason[];
}
