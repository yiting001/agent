import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { SkillRepository } from './skill.repository';
import { SkillUsage } from './skill-usage';

@Injectable()
export class DeleteSkillUseCase {
  constructor(
    private readonly repository: SkillRepository,
    private readonly usage: SkillUsage,
  ) {}

  async execute(id: string): Promise<void> {
    const skill = await this.repository.findById(id);

    if (!skill) {
      throw new ApplicationError('not_found', '技能不存在。');
    }

    const boundAgents = await this.usage.countBoundAgents(id);

    if (boundAgents > 0) {
      throw new ApplicationError(
        'conflict',
        `技能仍被 ${boundAgents} 个智能体使用，请先解绑后再卸载。`,
      );
    }

    await this.repository.delete(id);
  }
}
