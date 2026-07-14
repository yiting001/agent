import type { AgentMemory, AgentMemoryArtifact } from '../domain/agent-memory';
import type { AgentMemoryTask } from '../domain/agent-memory-task';
import { AgentMemoryArtifactEntity } from './agent-memory-artifact.entity';
import { AgentMemoryTaskEntity } from './agent-memory-task.entity';
import { AgentMemoryEntity } from './agent-memory.entity';

export function toMemory(entity: AgentMemoryEntity): AgentMemory {
  return {
    accessCount: entity.accessCount,
    agentId: entity.agentId,
    content: entity.content,
    createdAt: entity.createdAt,
    id: entity.id,
    idempotencyKey: entity.idempotencyKey,
    importance: entity.importance,
    indexedAt: entity.indexedAt ?? undefined,
    lastAccessedAt: entity.lastAccessedAt,
    ownerKey: entity.ownerKey,
    sourceThreadId: entity.sourceThreadId,
    status: entity.status,
    type: entity.type,
    updatedAt: entity.updatedAt,
  };
}

export function toArtifact(
  entity: AgentMemoryArtifactEntity,
): AgentMemoryArtifact {
  return {
    agentId: entity.agentId,
    attachmentId: entity.attachmentId,
    createdAt: entity.createdAt,
    fileName: entity.fileName,
    id: entity.id,
    memoryId: entity.memoryId,
    mimeType: entity.mimeType,
    ownerKey: entity.ownerKey,
    sizeBytes: entity.sizeBytes,
  };
}

export function toTask(entity: AgentMemoryTaskEntity): AgentMemoryTask {
  return {
    agentId: entity.agentId,
    attempts: entity.attempts,
    completedAt: entity.completedAt ?? undefined,
    createdAt: entity.createdAt,
    embedding: entity.embeddingJson,
    embeddingDimensions: entity.embeddingDimensions,
    id: entity.id,
    kind: entity.kind,
    lastError: entity.lastError ?? undefined,
    lockedAt: entity.lockedAt ?? undefined,
    lockOwner: entity.lockOwner ?? undefined,
    maxAttempts: entity.maxAttempts,
    memoryId: entity.memoryId,
    nextRunAt: entity.nextRunAt,
    ownerKey: entity.ownerKey,
    status: entity.status,
    updatedAt: entity.updatedAt,
  };
}
