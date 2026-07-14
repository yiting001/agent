import type { AgentMemoryArtifact, AgentMemory } from '../domain/agent-memory';
import type {
  AgentMemoryTask,
  AgentMemoryTaskStatus,
} from '../domain/agent-memory-task';
import type { SaveMemoryArtifactInput } from './agent-memory.repository';

/** 创建情景记忆及首个 extract 任务的事务输入。 */
export interface EnqueueEpisodeInput {
  agentId: string;
  artifacts: Array<Omit<SaveMemoryArtifactInput, 'memoryId'>>;
  content: string;
  /** 同一情景只允许创建一次的稳定键。 */
  idempotencyKey: string;
  maxAttempts: number;
  now: Date;
  ownerKey: string;
  sourceThreadId?: string;
}

/** 情景入队结果，用于区分新任务和幂等命中。 */
export interface EnqueueEpisodeResult {
  memory: AgentMemory;
  /** false 表示已有相同幂等键的记忆或任务。 */
  taskEnqueued: boolean;
}

/** 一次 owner 范围一致性修复的分类计数。 */
export interface AgentMemoryConsistencyRepair {
  danglingArtifacts: number;
  expiredProcessingTasks: number;
  failedMemories: number;
  missingIndexes: number;
  orphanMedia: number;
  queuedExtractTasks: number;
  queuedIndexTasks: number;
}

/** owner 范围内记忆任务和索引的健康快照。 */
export interface AgentMemoryHealth {
  deadTasks: number;
  danglingArtifacts: number;
  missingIndexes: number;
  orphanMedia: number;
  pendingMemories: number;
  processingTasks: number;
  queuedTasks: number;
  readyWithoutIndex: number;
}

/** 用于后台全量巡检的最小隔离范围。 */
export interface AgentMemoryOwnerScope {
  agentId: string;
  ownerKey: string;
}

/** 情景记忆任务、租约和一致性修复的事务端口。 */
export abstract class AgentMemoryTaskRepository {
  /** 使用行锁跳过已领取任务，并写入新的 lockOwner 租约。 */
  abstract claimNextTask(input: {
    lockOwner: string;
    now: Date;
  }): Promise<AgentMemoryTask | undefined>;

  /** 在当前租约仍有效时写入提取结果并创建 index 任务。 */
  abstract completeExtraction(input: {
    content: string;
    importance: number;
    maxAttempts: number;
    now: Date;
    task: AgentMemoryTask;
  }): Promise<void>;

  /** 在当前租约仍有效时标记记忆和 index 任务完成。 */
  abstract completeIndex(input: {
    indexedAt: Date;
    task: AgentMemoryTask;
  }): Promise<void>;

  /** 原子创建 pending 记忆、附件和 extract 任务。 */
  abstract enqueueEpisode(
    input: EnqueueEpisodeInput,
  ): Promise<EnqueueEpisodeResult>;

  /** 仅由当前租约持有者将任务重排队或标记 dead。 */
  abstract failTask(input: {
    dead: boolean;
    errorMessage: string;
    nextRunAt: Date;
    task: AgentMemoryTask;
  }): Promise<void>;

  /** 统计指定 owner 范围内的任务、索引和附件异常。 */
  abstract getHealth(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryHealth>;

  /** 列出数据库存在但对象文件缺失的候选附件。 */
  abstract listDanglingArtifactCandidates(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryArtifact[]>;

  /** 列出应当存在向量索引的 ready 记忆。 */
  abstract listReadyMemories(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemory[]>;

  /** 返回去重后的 agentId + ownerKey 巡检范围。 */
  abstract listOwnerScopes(): Promise<AgentMemoryOwnerScope[]>;

  abstract listTasks(input: {
    agentId: string;
    ownerKey: string;
    status?: AgentMemoryTaskStatus;
  }): Promise<AgentMemoryTask[]>;

  abstract markMemoryFailed(input: {
    agentId: string;
    memoryId: string;
    now: Date;
    ownerKey: string;
    reason: string;
  }): Promise<void>;

  abstract reconcileOwner(input: {
    agentId: string;
    maxAttempts: number;
    now: Date;
    olderThan: Date;
    ownerKey: string;
  }): Promise<AgentMemoryConsistencyRepair>;

  /** 将超时 processing 租约恢复为可重试或 dead 状态。 */
  abstract reclaimExpired(input: {
    lockTimeoutMs: number;
    now: Date;
  }): Promise<number>;

  /** 人工恢复 dead 或 failed 任务，并受最大尝试次数约束。 */
  abstract recoverTasks(input: {
    agentId: string;
    maxAttempts: number;
    memoryId?: string;
    now: Date;
    ownerKey: string;
  }): Promise<number>;

  /** 为缺失索引的 ready 记忆幂等补建 index 任务。 */
  abstract repairMissingIndex(input: {
    agentId: string;
    maxAttempts: number;
    memoryId: string;
    now: Date;
    ownerKey: string;
  }): Promise<void>;

  /** 暂存 extract 阶段生成的向量，供后续 index 任务使用。 */
  abstract saveTaskEmbedding(input: {
    dimensions: number;
    task: AgentMemoryTask;
    vector: number[];
  }): Promise<void>;
}
