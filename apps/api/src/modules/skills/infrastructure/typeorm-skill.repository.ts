import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import type { Skill } from '../domain/skill';
import { SkillRepository } from '../application/skill.repository';
import { SkillEntity } from './skill.entity';

@Injectable()
export class TypeOrmSkillRepository extends SkillRepository {
  constructor(
    @InjectRepository(SkillEntity)
    private readonly skills: Repository<SkillEntity>,
  ) {
    super();
  }

  async delete(id: string): Promise<void> {
    await this.skills.delete({ id });
  }

  async findById(id: string): Promise<Skill | undefined> {
    const entity = await this.skills.findOneBy({ id });

    return entity ? { ...entity } : undefined;
  }

  async findByIds(ids: string[]): Promise<Skill[]> {
    if (ids.length === 0) {
      return [];
    }

    const entities = await this.skills.findBy({ id: In(ids) });

    return entities.map((entity) => ({ ...entity }));
  }

  async list(): Promise<Skill[]> {
    const entities = await this.skills.find({
      order: { updatedAt: 'DESC' },
    });

    return entities.map((entity) => ({ ...entity }));
  }

  async save(skill: Skill): Promise<void> {
    await this.skills.save(skill);
  }
}
