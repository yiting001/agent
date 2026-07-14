export type MemorySource = 'admin' | 'api' | 'public';
export type MemoryStatus = 'failed' | 'pending' | 'ready';
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
  idempotencyKey?: string;
  indexedAt?: Date;
  lastAccessedAt?: Date;
  ownerKey: string;
  sourceThreadId?: string;
  status: MemoryStatus;
  type: MemoryType;
  updatedAt: Date;
}

export interface AgentMemoryArtifact {
  agentId: string;
  attachmentId: string;
  createdAt: Date;
  fileName: string;
  id: string;
  memoryId: string;
  mimeType: string;
  ownerKey: string;
  sizeBytes: number;
}

export interface AgentMemoryArtifactSummary {
  fileName: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AgentMemorySummary {
  accessCount: number;
  artifacts: AgentMemoryArtifactSummary[];
  content: string;
  id: string;
  importance: number;
  indexedAt?: string;
  lastAccessedAt?: string;
  sourceThreadId?: string;
  status: MemoryStatus;
  type: MemoryType;
  updatedAt: string;
}

export interface RecalledMemory {
  artifacts?: AgentMemoryArtifactSummary[];
  content: string;
  createdAt?: Date;
  id: string;
  score: number;
  type: MemoryType;
}

export function toAgentMemorySummary(
  memory: AgentMemory,
  artifacts: AgentMemoryArtifact[] = [],
): AgentMemorySummary {
  return {
    accessCount: memory.accessCount,
    artifacts: artifacts.map((artifact) => ({
      fileName: artifact.fileName,
      id: artifact.id,
      mimeType: artifact.mimeType,
      sizeBytes: artifact.sizeBytes,
    })),
    content: memory.content,
    id: memory.id,
    importance: memory.importance,
    indexedAt: memory.indexedAt?.toISOString(),
    lastAccessedAt: memory.lastAccessedAt?.toISOString(),
    sourceThreadId: memory.sourceThreadId,
    status: memory.status,
    type: memory.type,
    updatedAt: memory.updatedAt.toISOString(),
  };
}
