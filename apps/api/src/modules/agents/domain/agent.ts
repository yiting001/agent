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
