import type { AgentMemoryArtifact, AgentMemory } from '../domain/agent-memory';
import type {
  AgentMemoryTask,
  AgentMemoryTaskStatus,
} from '../domain/agent-memory-task';
import type { SaveMemoryArtifactInput } from './agent-memory.repository';

export interface EnqueueEpisodeInput {
  agentId: string;
  artifacts: Array<Omit<SaveMemoryArtifactInput, 'memoryId'>>;
  content: string;
  idempotencyKey: string;
  maxAttempts: number;
  now: Date;
  ownerKey: string;
  sourceThreadId?: string;
}

export interface EnqueueEpisodeResult {
  memory: AgentMemory;
  taskEnqueued: boolean;
}

export interface AgentMemoryConsistencyRepair {
  danglingArtifacts: number;
  expiredProcessingTasks: number;
  failedMemories: number;
  missingIndexes: number;
  orphanMedia: number;
  queuedExtractTasks: number;
  queuedIndexTasks: number;
}

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

export interface AgentMemoryOwnerScope {
  agentId: string;
  ownerKey: string;
}

export abstract class AgentMemoryTaskRepository {
  abstract claimNextTask(input: {
    lockOwner: string;
    now: Date;
  }): Promise<AgentMemoryTask | undefined>;

  abstract completeExtraction(input: {
    content: string;
    importance: number;
    maxAttempts: number;
    now: Date;
    task: AgentMemoryTask;
  }): Promise<void>;

  abstract completeIndex(input: {
    indexedAt: Date;
    task: AgentMemoryTask;
  }): Promise<void>;

  abstract enqueueEpisode(
    input: EnqueueEpisodeInput,
  ): Promise<EnqueueEpisodeResult>;

  abstract failTask(input: {
    dead: boolean;
    errorMessage: string;
    nextRunAt: Date;
    task: AgentMemoryTask;
  }): Promise<void>;

  abstract getHealth(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryHealth>;

  abstract listDanglingArtifactCandidates(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryArtifact[]>;

  abstract listReadyMemories(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemory[]>;

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

  abstract reclaimExpired(input: {
    lockTimeoutMs: number;
    now: Date;
  }): Promise<number>;

  abstract recoverTasks(input: {
    agentId: string;
    maxAttempts: number;
    memoryId?: string;
    now: Date;
    ownerKey: string;
  }): Promise<number>;

  abstract repairMissingIndex(input: {
    agentId: string;
    maxAttempts: number;
    memoryId: string;
    now: Date;
    ownerKey: string;
  }): Promise<void>;

  abstract saveTaskEmbedding(input: {
    dimensions: number;
    task: AgentMemoryTask;
    vector: number[];
  }): Promise<void>;
}
