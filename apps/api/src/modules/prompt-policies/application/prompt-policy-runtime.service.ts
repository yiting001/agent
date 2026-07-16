import { Injectable } from '@nestjs/common';

import type { PromptPolicy } from '../domain/prompt-policy';
import { PromptPolicyRepository } from './prompt-policy.repository';

/** 对话链路只读取已启用策略，不暴露管理端更新细节。 */
@Injectable()
export class PromptPolicyRuntimeService {
  constructor(private readonly repository: PromptPolicyRepository) {}

  async loadEnabled(): Promise<PromptPolicy[]> {
    return (await this.repository.list()).filter((policy) => policy.enabled);
  }
}
