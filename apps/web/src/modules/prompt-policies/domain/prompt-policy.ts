export type PromptPolicyCategory = 'behavior' | 'output' | 'safety';
export type PromptPolicySource = 'builtin';

/** 管理端展示和编辑的内置提示词策略。 */
export interface PromptPolicy {
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

export interface UpdatePromptPolicyInput {
  content: string;
  description: string;
  enabled: boolean;
  expectedRevision: number;
  name: string;
  priority: number;
}
