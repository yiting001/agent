export type AgentStatus = 'disabled' | 'draft' | 'published';
export type ResourceStatus =
  | 'disabled'
  | 'empty'
  | 'failed'
  | 'processing'
  | 'ready';

export interface AgentSummary {
  conversationCount: number;
  description: string;
  id: string;
  moduleIds: string[];
  name: string;
  providerId: string;
  status: AgentStatus;
  systemPrompt: string;
  temperature: number;
  updatedAt: string;
}

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

export interface ModelProviderSummary {
  baseUrl: string;
  chatModel?: string;
  configured: boolean;
  description: string;
  embeddingDimensions?: number;
  embeddingModel?: string;
  enabled: boolean;
  id: string;
  key: string;
  name: string;
  updatedAt: string;
}

export interface ApiApplicationSummary {
  agentId: string;
  createdAt: string;
  endpoint: string;
  id: string;
  maskedKey: string;
  name: string;
  requestCount: number;
  secretKey?: string;
  status: 'disabled' | 'ready';
}

export interface CreateAgentInput {
  description: string;
  moduleIds: string[];
  name: string;
  providerId: string;
  systemPrompt: string;
  temperature: number;
}

export interface CreateKnowledgeBaseInput {
  description: string;
  embeddingProviderId: string;
  name: string;
}

export interface CreateKnowledgeModuleInput {
  description: string;
  knowledgeBaseId: string;
  name: string;
}

export interface ConfigureProviderInput {
  apiKey: string;
  baseUrl: string;
  chatModel?: string;
  description: string;
  embeddingDimensions?: number;
  embeddingModel?: string;
  key: string;
  name: string;
}

export interface CreateApiApplicationInput {
  agentId: string;
  name: string;
}

export interface ChatAttachmentSummary {
  fileName: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ConversationMessage {
  attachments?: ChatAttachmentSummary[];
  content: string;
  role: 'assistant' | 'user';
}

export interface AgentChatResponse {
  agentId: string;
  answer: string;
  citations: Array<{
    documentId: string;
    fileName: string;
    moduleId: string;
    score: number;
  }>;
}
