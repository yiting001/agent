import type { Skill } from '../domain/skill';

export abstract class SkillRepository {
  abstract delete(id: string): Promise<void>;
  abstract findById(id: string): Promise<Skill | undefined>;
  abstract findByIds(ids: string[]): Promise<Skill[]>;
  abstract list(): Promise<Skill[]>;
  abstract save(skill: Skill): Promise<void>;
}
