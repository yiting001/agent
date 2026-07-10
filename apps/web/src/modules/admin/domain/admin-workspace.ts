export type AgentStatus = 'published' | 'draft' | 'disabled';
export type ResourceStatus = 'ready' | 'processing' | 'disabled';

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  model: string;
  knowledgeBaseCount: number;
  conversationCount: number;
  status: AgentStatus;
  updatedAt: string;
}

export interface KnowledgeBaseSummary {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  size: string;
  status: ResourceStatus;
  updatedAt: string;
}

export interface ModelProviderSummary {
  id: string;
  name: string;
  description: string;
  model: string;
  endpoint: string;
  configured: boolean;
  enabled: boolean;
}

export interface ApiApplicationSummary {
  id: string;
  name: string;
  agentName: string;
  endpoint: string;
  maskedKey: string;
  status: ResourceStatus;
  requestCount: number;
  createdAt: string;
}

export interface CreateAgentInput {
  name: string;
  description: string;
  model: string;
}

export interface CreateKnowledgeBaseInput {
  name: string;
  description: string;
}

export interface ConfigureProviderInput {
  providerId: string;
  model: string;
  endpoint: string;
}

export interface CreateApiApplicationInput {
  name: string;
  agentName: string;
}
