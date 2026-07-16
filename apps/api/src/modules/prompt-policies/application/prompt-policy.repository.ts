import type { PromptPolicy } from '../domain/prompt-policy';

/** 内置提示词策略的持久化端口。 */
export abstract class PromptPolicyRepository {
  abstract findById(id: string): Promise<PromptPolicy | undefined>;
  abstract list(): Promise<PromptPolicy[]>;

  /**
   * 按预期 revision 原子更新；返回 false 表示数据已被其他请求修改。
   */
  abstract update(
    policy: PromptPolicy,
    expectedRevision: number,
  ): Promise<boolean>;
}
