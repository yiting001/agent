export type MemorySource = 'admin' | 'api' | 'public';
export type MemoryType = 'episodic' | 'preference' | 'semantic';

export interface AgentMemoryThread {
  agentId: string;
  createdAt: Date;
  id: string;
  ownerKey: string;
  source: MemorySource;
  title: string;
  updatedAt: Date;
}

export interface AgentMemoryMessage {
  content: string;
  createdAt: Date;
  id: string;
  ownerKey: string;
  position: number;
  role: 'assistant' | 'user';
  threadId: string;
}

export interface AgentMemory {
  accessCount: number;
  agentId: string;
  content: string;
  createdAt: Date;
  id: string;
  importance: number;
  lastAccessedAt?: Date;
  ownerKey: string;
  sourceThreadId?: string;
  type: MemoryType;
  updatedAt: Date;
}

export interface AgentMemorySummary {
  accessCount: number;
  content: string;
  id: string;
  importance: number;
  lastAccessedAt?: string;
  sourceThreadId?: string;
  type: MemoryType;
  updatedAt: string;
}

export interface RecalledMemory {
  content: string;
  id: string;
  score: number;
  type: MemoryType;
}

export function toAgentMemorySummary(memory: AgentMemory): AgentMemorySummary {
  return {
    accessCount: memory.accessCount,
    content: memory.content,
    id: memory.id,
    importance: memory.importance,
    lastAccessedAt: memory.lastAccessedAt?.toISOString(),
    sourceThreadId: memory.sourceThreadId,
    type: memory.type,
    updatedAt: memory.updatedAt.toISOString(),
  };
}
