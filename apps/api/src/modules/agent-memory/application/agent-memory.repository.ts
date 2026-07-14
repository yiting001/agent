import type {
  AgentMemory,
  AgentMemoryArtifact,
  AgentMemoryMessage,
  AgentMemoryThread,
} from '../domain/agent-memory';

export interface SaveMemoryInput {
  agentId: string;
  content: string;
  importance: number;
  ownerKey: string;
  sourceThreadId?: string;
  status?: AgentMemory['status'];
  type: AgentMemory['type'];
}

export interface SaveMemoryArtifactInput {
  agentId: string;
  attachmentId: string;
  fileName: string;
  memoryId: string;
  mimeType: string;
  ownerKey: string;
  sizeBytes: number;
}

export interface UpdateMemoryInput {
  agentId: string;
  content: string;
  importance: number;
  memoryId: string;
  ownerKey: string;
  status: AgentMemory['status'];
}

export abstract class AgentMemoryRepository {
  abstract clearAgentMemory(agentId: string, ownerKey: string): Promise<void>;

  abstract deleteMemory(
    agentId: string,
    ownerKey: string,
    memoryId: string,
  ): Promise<void>;

  abstract appendMessages(
    threadId: string,
    ownerKey: string,
    messages: Array<Pick<AgentMemoryMessage, 'content' | 'role'>>,
  ): Promise<void>;

  abstract findThread(
    id: string,
    ownerKey: string,
  ): Promise<AgentMemoryThread | undefined>;

  abstract findMemory(
    agentId: string,
    ownerKey: string,
    memoryId: string,
  ): Promise<AgentMemory | undefined>;

  abstract listArtifacts(
    agentId: string,
    ownerKey: string,
    memoryIds?: string[],
  ): Promise<AgentMemoryArtifact[]>;

  abstract listMemories(
    agentId: string,
    ownerKey: string,
    limit: number,
  ): Promise<AgentMemory[]>;

  abstract listRecentMessages(
    threadId: string,
    ownerKey: string,
    limit: number,
  ): Promise<AgentMemoryMessage[]>;

  abstract saveMemory(input: SaveMemoryInput): Promise<AgentMemory>;

  abstract saveArtifacts(inputs: SaveMemoryArtifactInput[]): Promise<void>;

  abstract saveThread(thread: AgentMemoryThread): Promise<void>;

  abstract touchMemories(ids: string[], at: Date): Promise<void>;

  abstract updateMemory(
    input: UpdateMemoryInput,
  ): Promise<AgentMemory | undefined>;
}
