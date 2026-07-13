import { Injectable } from '@nestjs/common';

import type { SkillSummary } from '../domain/skill';
import { toSkillSummary } from '../domain/skill';
import { SkillRepository } from './skill.repository';

@Injectable()
export class ListSkillsUseCase {
  constructor(private readonly repository: SkillRepository) {}

  async execute(): Promise<SkillSummary[]> {
    const skills = await this.repository.list();

    return skills.map(toSkillSummary);
  }
}
