/** API 应用状态；停用状态不能通过密钥发起模型调用。 */
export type ApiApplicationStatus = 'disabled' | 'ready';

/** 绑定单个智能体的 API 调用凭证聚合。 */
export interface ApiApplication {
  agentId: string;
  createdAt: Date;
  id: string;
  /** 原始密钥的不可逆摘要，仅用于认证查询。 */
  keyHash: string;
  /** 可安全展示的密钥掩码，不具备认证能力。 */
  maskedKey: string;
  name: string;
  requestCount: number;
  status: ApiApplicationStatus;
}

/** 管理端 API 应用视图。 */
export interface ApiApplicationSummary {
  agentId: string;
  createdAt: string;
  endpoint: string;
  id: string;
  maskedKey: string;
  name: string;
  requestCount: number;
  /** 仅在创建响应中返回一次，后续列表不会再次暴露原始密钥。 */
  secretKey?: string;
  status: ApiApplicationStatus;
}
