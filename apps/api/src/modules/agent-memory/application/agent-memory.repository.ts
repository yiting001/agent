import type {
  AgentMemory,
  AgentMemoryArtifact,
  AgentMemoryMessage,
  AgentMemoryThread,
} from '../domain/agent-memory';

/** 创建长期记忆所需的领域输入。 */
export interface SaveMemoryInput {
  agentId: string;
  content: string;
  importance: number;
  /** 同一业务事实的稳定键，用于阻止重复写入。 */
  idempotencyKey?: string;
  indexedAt?: Date;
  /** 客户端提供的隔离键，所有仓储操作必须同时过滤。 */
  ownerKey: string;
  sourceThreadId?: string;
  status?: AgentMemory['status'];
  type: AgentMemory['type'];
}

/** 将受 owner 约束的聊天附件关联到情景记忆。 */
export interface SaveMemoryArtifactInput {
  agentId: string;
  attachmentId: string;
  fileName: string;
  memoryId: string;
  mimeType: string;
  ownerKey: string;
  sizeBytes: number;
}

/** 在不改变所有者和类型的前提下更新记忆内容及索引状态。 */
export interface UpdateMemoryInput {
  agentId: string;
  content: string;
  indexedAt?: Date;
  importance: number;
  memoryId: string;
  ownerKey: string;
  status: AgentMemory['status'];
}

/** 会话、消息、长期记忆和附件的 owner-safe 持久化端口。 */
export abstract class AgentMemoryRepository {
  /** 清除指定智能体和所有者范围内的全部记忆数据。 */
  abstract clearAgentMemory(agentId: string, ownerKey: string): Promise<void>;

  abstract deleteMemory(
    agentId: string,
    ownerKey: string,
    memoryId: string,
  ): Promise<void>;

  /** 追加消息时由仓储分配连续 position，避免并发顺序冲突。 */
  abstract appendMessages(
    threadId: string,
    ownerKey: string,
    messages: Array<Pick<AgentMemoryMessage, 'content' | 'role'>>,
  ): Promise<void>;

  /** 查询必须同时命中线程标识和 ownerKey。 */
  abstract findThread(
    id: string,
    ownerKey: string,
  ): Promise<AgentMemoryThread | undefined>;

  /** 查询必须同时命中 agentId、ownerKey 和 memoryId。 */
  abstract findMemory(
    agentId: string,
    ownerKey: string,
    memoryId: string,
  ): Promise<AgentMemory | undefined>;

  /** 仅返回指定 owner 范围的附件，可进一步按 memoryIds 过滤。 */
  abstract listArtifacts(
    agentId: string,
    ownerKey: string,
    memoryIds?: string[],
  ): Promise<AgentMemoryArtifact[]>;

  /** 按最近更新时间返回有限数量的记忆。 */
  abstract listMemories(
    agentId: string,
    ownerKey: string,
    limit: number,
  ): Promise<AgentMemory[]>;

  /** 按线程顺序返回最近消息，并保持 owner 隔离。 */
  abstract listRecentMessages(
    threadId: string,
    ownerKey: string,
    limit: number,
  ): Promise<AgentMemoryMessage[]>;

  /** 幂等创建或返回已存在的记忆。 */
  abstract saveMemory(input: SaveMemoryInput): Promise<AgentMemory>;

  /** 批量保存附件关联，输入为空时应安全无操作。 */
  abstract saveArtifacts(inputs: SaveMemoryArtifactInput[]): Promise<void>;

  abstract saveThread(thread: AgentMemoryThread): Promise<void>;

  /** 原子增加召回次数并更新最后访问时间。 */
  abstract touchMemories(ids: string[], at: Date): Promise<void>;

  abstract updateMemory(
    input: UpdateMemoryInput,
  ): Promise<AgentMemory | undefined>;
}
