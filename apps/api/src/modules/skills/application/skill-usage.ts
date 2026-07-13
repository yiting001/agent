export abstract class SkillUsage {
  abstract countBoundAgents(skillId: string): Promise<number>;
}
