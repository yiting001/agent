export interface IndexedAgentMemory {
  agentId: string;
  content: string;
  memoryId: string;
  ownerKey: string;
  vector: number[];
}

export interface AgentMemoryIndexSearchResult {
  content: string;
  memoryId: string;
  score: number;
}

export abstract class AgentMemoryIndex {
  abstract clear(agentId: string, ownerKey: string): Promise<void>;
  abstract delete(memoryIds: string[]): Promise<void>;
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
