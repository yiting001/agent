/** 删除技能前检查智能体绑定关系的应用层端口。 */
export abstract class SkillUsage {
  /** 返回绑定指定技能的智能体数量。 */
  abstract countBoundAgents(skillId: string): Promise<number>;
}
