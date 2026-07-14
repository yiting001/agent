import type {
  Agent,
  AgentDetail,
  AgentStatus,
  AgentSummary,
} from '../domain/agent';

/** 智能体聚合及其知识、技能绑定的持久化端口。 */
export abstract class AgentRepository {
  abstract delete(id: string): Promise<void>;
  abstract findById(id: string): Promise<AgentDetail | undefined>;
  /** 原子递增成功对话计数，避免并发读改写丢失。 */
  abstract incrementConversationCount(id: string): Promise<void>;
  abstract list(): Promise<AgentSummary[]>;
  /** 在同一事务内保存智能体及其知识模块、技能绑定。 */
  abstract save(
    agent: Agent,
    moduleIds: string[],
    skillIds: string[],
  ): Promise<void>;
  abstract updateStatus(id: string, status: AgentStatus): Promise<void>;
}
