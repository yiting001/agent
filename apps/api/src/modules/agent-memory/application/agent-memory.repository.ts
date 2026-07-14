import type {
  AgentMemory,
  AgentMemoryMessage,
  AgentMemoryThread,
} from '../domain/agent-memory';

export interface SaveMemoryInput {
  agentId: string;
  content: string;
  importance: number;
  ownerKey: string;
  sourceThreadId?: string;
  type: AgentMemory['type'];
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

  abstract saveThread(thread: AgentMemoryThread): Promise<void>;

  abstract touchMemories(ids: string[], at: Date): Promise<void>;
}
