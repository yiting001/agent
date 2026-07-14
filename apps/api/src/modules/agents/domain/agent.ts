/** 智能体生命周期：草稿仅供后台编辑和测试，已发布才可公开调用，停用后禁止公开对话。 */
export type AgentStatus = 'disabled' | 'draft' | 'published';

/** 智能体聚合的持久化领域状态。 */
export interface Agent {
  /** 成功完成的对话次数，用于运营统计。 */
  conversationCount: number;
  createdAt: Date;
  description: string;
  id: string;
  name: string;
  /** 当前绑定的模型供应商标识。 */
  providerId: string;
  status: AgentStatus;
  /** 每轮对话注入模型的系统级指令。 */
  systemPrompt: string;
  /** 模型采样温度，由具体模型适配器解释。 */
  temperature: number;
  updatedAt: Date;
}

/** 管理端读取的智能体详情，包含知识模块和技能绑定。 */
export interface AgentDetail extends Agent {
  moduleIds: string[];
  skillIds: string[];
}

/** 面向公开对话页的智能体信息，只暴露展示必需字段。 */
export interface PublicAgentSummary {
  description: string;
  id: string;
  name: string;
}

/** 管理端列表使用的序列化智能体视图。 */
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
