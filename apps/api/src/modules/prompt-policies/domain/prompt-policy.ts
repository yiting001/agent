/** 内置提示词的业务分类，便于管理端分组并为后续策略扩展保留稳定语义。 */
export type PromptPolicyCategory = 'behavior' | 'output' | 'safety';

/** 当前策略由系统内置；可安装提示词能力继续由 skills 模块负责。 */
export type PromptPolicySource = 'builtin';

/** 可持久化、可启停的全局系统提示词策略。 */
export interface PromptPolicy {
  category: PromptPolicyCategory;
  content: string;
  createdAt: Date;
  description: string;
  enabled: boolean;
  id: string;
  key: string;
  name: string;
  /** 数值越小越先注入，保证多条策略的组合顺序稳定。 */
  priority: number;
  /** 乐观锁版本，防止多个管理员相互覆盖编辑结果。 */
  revision: number;
  source: PromptPolicySource;
  updatedAt: Date;
}

/** 管理端读取的内置提示词视图。 */
export interface PromptPolicySummary {
  category: PromptPolicyCategory;
  content: string;
  createdAt: string;
  description: string;
  enabled: boolean;
  id: string;
  key: string;
  name: string;
  priority: number;
  revision: number;
  source: PromptPolicySource;
  updatedAt: string;
}

/** 将领域对象转换为 HTTP 和前端共用的序列化视图。 */
export function toPromptPolicySummary(
  policy: PromptPolicy,
): PromptPolicySummary {
  return {
    category: policy.category,
    content: policy.content,
    createdAt: policy.createdAt.toISOString(),
    description: policy.description,
    enabled: policy.enabled,
    id: policy.id,
    key: policy.key,
    name: policy.name,
    priority: policy.priority,
    revision: policy.revision,
    source: policy.source,
    updatedAt: policy.updatedAt.toISOString(),
  };
}
