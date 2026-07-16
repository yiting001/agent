import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { PromptPolicySummary } from '../domain/prompt-policy';
import { toPromptPolicySummary } from '../domain/prompt-policy';
import { PromptPolicyRepository } from './prompt-policy.repository';

export interface UpdatePromptPolicyCommand {
  content: string;
  description: string;
  enabled: boolean;
  expectedRevision: number;
  id: string;
  name: string;
  priority: number;
}

/** 更新内置提示词，并通过 revision 乐观锁拒绝过期表单。 */
@Injectable()
export class UpdatePromptPolicyUseCase {
  constructor(private readonly repository: PromptPolicyRepository) {}

  async execute(
    command: UpdatePromptPolicyCommand,
  ): Promise<PromptPolicySummary> {
    const current = await this.repository.findById(command.id);

    if (!current) {
      throw new ApplicationError('not_found', '内置提示词不存在。');
    }

    if (current.revision !== command.expectedRevision) {
      throw this.concurrentUpdateError();
    }

    const content = command.content.trim();
    const description = command.description.trim();
    const name = command.name.trim();

    if (
      !content ||
      content.length > 20_000 ||
      !name ||
      name.length > 80 ||
      description.length > 240
    ) {
      throw new ApplicationError(
        'invalid_operation',
        '提示词名称、描述或内容不符合长度要求。',
      );
    }

    if (
      !Number.isInteger(command.priority) ||
      command.priority < 0 ||
      command.priority > 1_000
    ) {
      throw new ApplicationError(
        'invalid_operation',
        '提示词优先级必须是 0 到 1000 之间的整数。',
      );
    }

    const updated = {
      ...current,
      content,
      description,
      enabled: command.enabled,
      name,
      priority: command.priority,
      revision: current.revision + 1,
      updatedAt: new Date(),
    };
    const saved = await this.repository.update(
      updated,
      command.expectedRevision,
    );

    if (!saved) {
      throw this.concurrentUpdateError();
    }

    return toPromptPolicySummary(updated);
  }

  /** 并发冲突统一转换为可重试的应用错误，不静默覆盖其他管理员修改。 */
  private concurrentUpdateError(): ApplicationError {
    return new ApplicationError(
      'conflict',
      '提示词已被其他管理员更新，请刷新后重试。',
    );
  }
}
