export abstract class KnowledgeModuleUsage {
  abstract countBoundAgents(moduleIds: string[]): Promise<number>;
}
