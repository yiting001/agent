import type {
  Agent,
  AgentDetail,
  AgentStatus,
  AgentSummary,
} from '../domain/agent';

export abstract class AgentRepository {
  abstract delete(id: string): Promise<void>;
  abstract findById(id: string): Promise<AgentDetail | undefined>;
  abstract incrementConversationCount(id: string): Promise<void>;
  abstract list(): Promise<AgentSummary[]>;
  abstract save(agent: Agent, moduleIds: string[]): Promise<void>;
  abstract update(agent: Agent, moduleIds: string[]): Promise<void>;
  abstract updateStatus(id: string, status: AgentStatus): Promise<void>;
}
