import type { Skill } from '../domain/skill';

/** 技能定义及 MCP 工具快照的持久化端口。 */
export abstract class SkillRepository {
  abstract delete(id: string): Promise<void>;
  abstract findById(id: string): Promise<Skill | undefined>;
  abstract findByIds(ids: string[]): Promise<Skill[]>;
  abstract list(): Promise<Skill[]>;
  abstract save(skill: Skill): Promise<void>;
}
