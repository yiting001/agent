import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { Skill } from '../domain/skill';
import { SkillRepository } from './skill.repository';

/** 校验并读取技能，供其他模块（如智能体绑定）复用。 */
@Injectable()
export class SkillCatalogService {
  constructor(private readonly repository: SkillRepository) {}

  async getSkills(ids: string[]): Promise<Skill[]> {
    const unique = [...new Set(ids)];
    const skills = await this.repository.findByIds(unique);

    if (skills.length !== unique.length) {
      throw new ApplicationError('not_found', '部分技能不存在。');
    }

    return skills;
  }
}
