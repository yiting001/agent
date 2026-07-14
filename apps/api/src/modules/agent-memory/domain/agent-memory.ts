/** 记忆写入来源，用于区分管理端、正式 API 与公开聊天。 */
export type MemorySource = 'admin' | 'api' | 'public';
/** 情景记忆从待提取到可检索的生命周期。 */
export type MemoryStatus = 'failed' | 'pending' | 'ready';
/** 长期记忆的语义分类。 */
export type MemoryType = 'episodic' | 'preference' | 'semantic';

/** 单个智能体与所有者隔离范围内的会话线程。 */
export interface AgentMemoryThread {
  agentId: string;
  createdAt: Date;
  id: string;
  /** 客户端提供的隔离键；当前不是可信身份主体。 */
  ownerKey: string;
  source: MemorySource;
  title: string;
  updatedAt: Date;
}

/** 线程内按 position 排序的持久化消息。 */
export interface AgentMemoryMessage {
  content: string;
  createdAt: Date;
  id: string;
  /** 所有查询必须同时按 ownerKey 隔离。 */
  ownerKey: string;
  /** 线程内单调递增的位置。 */
  position: number;
  role: 'assistant' | 'user';
  threadId: string;
}

/** 可被上下文召回的长期记忆。 */
export interface AgentMemory {
  accessCount: number;
  agentId: string;
  content: string;
  createdAt: Date;
  id: string;
  /** 1-5 的重要度，参与召回排序。 */
  importance: number;
  /** 防止同一情景或重试重复创建记忆。 */
  idempotencyKey?: string;
  /** 向量索引成功写入的时间。 */
  indexedAt?: Date;
  lastAccessedAt?: Date;
  /** 客户端提供的隔离键；数据库和向量查询均必须使用。 */
  ownerKey: string;
  sourceThreadId?: string;
  status: MemoryStatus;
  type: MemoryType;
  updatedAt: Date;
}

/** 情景记忆引用的原始附件元数据。 */
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

/** 返回给管理端的附件摘要。 */
export interface AgentMemoryArtifactSummary {
  fileName: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
}

/** 返回给管理端的记忆及索引状态视图。 */
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

/** 拼装模型上下文时使用的召回结果。 */
export interface RecalledMemory {
  artifacts?: AgentMemoryArtifactSummary[];
  content: string;
  createdAt?: Date;
  id: string;
  /** 综合语义、词法、时间和重要度后的相关分。 */
  score: number;
  type: MemoryType;
}

/** 将持久化记忆转换为不暴露 ownerKey 的管理端视图。 */
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
