/** 删除知识模块前检查智能体绑定关系的应用层端口。 */
export abstract class KnowledgeModuleUsage {
  /** 返回绑定任一给定模块的智能体数量。 */
  abstract countBoundAgents(moduleIds: string[]): Promise<number>;
}
