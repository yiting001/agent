export type AgentStatus = 'disabled' | 'draft' | 'published';

export interface Agent {
  conversationCount: number;
  createdAt: Date;
  description: string;
  id: string;
  name: string;
  providerId: string;
  status: AgentStatus;
  systemPrompt: string;
  temperature: number;
  updatedAt: Date;
}

export interface AgentDetail extends Agent {
  moduleIds: string[];
}

/** 面向公开对话页的智能体信息，只暴露展示必需字段。 */
export interface PublicAgentSummary {
  description: string;
  id: string;
  name: string;
}

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
