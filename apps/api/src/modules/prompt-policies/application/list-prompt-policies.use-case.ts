import { Injectable } from '@nestjs/common';

import type { PromptPolicySummary } from '../domain/prompt-policy';
import { toPromptPolicySummary } from '../domain/prompt-policy';
import { PromptPolicyRepository } from './prompt-policy.repository';

/** 返回全部内置提示词，供管理端编辑与启停。 */
@Injectable()
export class ListPromptPoliciesUseCase {
  constructor(private readonly repository: PromptPolicyRepository) {}

  async execute(): Promise<PromptPolicySummary[]> {
    return (await this.repository.list()).map(toPromptPolicySummary);
  }
}
