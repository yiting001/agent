/** 写入向量索引的情景记忆。 */
export interface IndexedAgentMemory {
  agentId: string;
  content: string;
  memoryId: string;
  /** 客户端隔离键，查询和删除必须同时限定。 */
  ownerKey: string;
  vector: number[];
}

/** 情景记忆向量近邻结果。 */
export interface AgentMemoryIndexSearchResult {
  content: string;
  memoryId: string;
  /** 余弦相似度，越接近 1 越相关。 */
  score: number;
}

/** 情景记忆向量索引端口。 */
export abstract class AgentMemoryIndex {
  /** 清除指定智能体和 owner 范围内的全部向量。 */
  abstract clear(agentId: string, ownerKey: string): Promise<void>;
  abstract delete(memoryIds: string[]): Promise<void>;
  abstract exists(memoryId: string): Promise<boolean>;
  /** 在 agentId + ownerKey 范围内检索近邻。 */
  abstract search(input: {
    agentId: string;
    dimensions: number;
    limit: number;
    ownerKey: string;
    vector: number[];
  }): Promise<AgentMemoryIndexSearchResult[]>;
  abstract upsert(
    dimensions: number,
    memories: IndexedAgentMemory[],
  ): Promise<void>;
}
