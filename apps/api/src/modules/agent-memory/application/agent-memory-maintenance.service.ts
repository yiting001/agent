import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ObservabilityService } from '../../observability/application/observability.service';
import { ChatAttachmentStorage } from '../../chat/application/chat-attachment.storage';
import { AgentMemoryIndex } from './agent-memory.index';
import type {
  AgentMemoryConsistencyRepair,
  AgentMemoryHealth,
} from './agent-memory-task.repository';
import { AgentMemoryTaskRepository } from './agent-memory-task.repository';
import type {
  AgentMemoryTask,
  AgentMemoryTaskStatus,
} from '../domain/agent-memory-task';
import { sanitizeTaskError } from '../domain/agent-memory-task';

export interface AgentMemoryRecoverResult {
  recovered: number;
}

@Injectable()
export class AgentMemoryMaintenanceService {
  private readonly lockTimeoutMs: number;
  private readonly maxAttempts: number;
  private readonly pendingTimeoutMs: number;

  constructor(
    private readonly tasks: AgentMemoryTaskRepository,
    private readonly index: AgentMemoryIndex,
    private readonly attachmentStorage: ChatAttachmentStorage,
    private readonly observability: ObservabilityService,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.lockTimeoutMs = config.agentMemoryTaskLockTimeoutMs;
    this.maxAttempts = config.agentMemoryTaskMaxAttempts;
    this.pendingTimeoutMs = config.agentMemoryPendingTimeoutMs;
  }

  async getHealth(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryHealth> {
    const health = await this.tasks.getHealth(agentId, ownerKey);
    const [artifacts, media, memories] = await Promise.all([
      this.tasks.listDanglingArtifactCandidates(agentId, ownerKey),
      this.attachmentStorage.list({ agentId, ownerKey }),
      this.tasks.listReadyMemories(agentId, ownerKey),
    ]);
    const referenced = new Set(
      artifacts.map((artifact) => artifact.attachmentId),
    );
    let danglingArtifacts = 0;
    let missingIndexes = 0;

    for (const artifact of artifacts) {
      try {
        await this.attachmentStorage.read(artifact.attachmentId, {
          agentId,
          ownerKey,
        });
      } catch {
        danglingArtifacts += 1;
      }
    }

    for (const memory of memories.filter((item) => item.indexedAt)) {
      if (!(await this.index.exists(memory.id))) {
        missingIndexes += 1;
      }
    }

    return {
      ...health,
      danglingArtifacts,
      missingIndexes,
      orphanMedia: media.filter(
        (item) =>
          item.mimeType.startsWith('image/') && !referenced.has(item.id),
      ).length,
    };
  }

  async listTasks(
    agentId: string,
    ownerKey: string,
    status?: AgentMemoryTaskStatus,
  ): Promise<AgentMemoryTask[]> {
    return this.tasks.listTasks({ agentId, ownerKey, status });
  }

  async recover(
    agentId: string,
    ownerKey: string,
    memoryId?: string,
  ): Promise<AgentMemoryRecoverResult> {
    const recovered = await this.tasks.recoverTasks({
      agentId,
      maxAttempts: this.maxAttempts,
      memoryId,
      now: new Date(),
      ownerKey,
    });

    return { recovered };
  }

  async repairOwner(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryConsistencyRepair> {
    const now = new Date();
    const repair = await this.tasks.reconcileOwner({
      agentId,
      maxAttempts: this.maxAttempts,
      now,
      olderThan: new Date(now.getTime() - this.pendingTimeoutMs),
      ownerKey,
    });
    const artifacts = await this.tasks.listDanglingArtifactCandidates(
      agentId,
      ownerKey,
    );
    const media = await this.attachmentStorage.list({ agentId, ownerKey });
    const memories = await this.tasks.listReadyMemories(agentId, ownerKey);
    const referenced = new Set(
      artifacts.map((artifact) => artifact.attachmentId),
    );
    let danglingArtifacts = 0;
    let failedMemories = 0;
    let missingIndexes = 0;
    let orphanMedia = 0;

    for (const artifact of artifacts) {
      try {
        await this.attachmentStorage.read(artifact.attachmentId, {
          agentId,
          ownerKey,
        });
      } catch (error) {
        danglingArtifacts += 1;
        failedMemories += 1;
        await this.tasks.markMemoryFailed({
          agentId,
          memoryId: artifact.memoryId,
          now,
          ownerKey,
          reason: sanitizeTaskError(error),
        });
        await this.index.delete([artifact.memoryId]);
      }
    }

    for (const memory of memories.filter((item) => item.indexedAt)) {
      if (!(await this.index.exists(memory.id))) {
        missingIndexes += 1;
        await this.tasks.repairMissingIndex({
          agentId,
          maxAttempts: this.maxAttempts,
          memoryId: memory.id,
          now,
          ownerKey,
        });
      }
    }

    for (const item of media) {
      if (
        item.mimeType.startsWith('image/') &&
        !referenced.has(item.id) &&
        item.createdAt.getTime() <= now.getTime() - this.pendingTimeoutMs
      ) {
        orphanMedia += 1;
        await this.attachmentStorage.delete(item.id, { agentId, ownerKey });
      }
    }

    await this.observability.record({
      agentId,
      category: 'tool',
      durationMs: 0,
      metadata: {
        danglingArtifacts,
        domain: 'agent-memory',
        failedMemories,
        missingIndexes,
        orphanMedia,
        queuedExtractTasks: repair.queuedExtractTasks,
        queuedIndexTasks: repair.queuedIndexTasks,
      },
      operation: 'agent_memory.consistency_repair',
      startedAt: now,
      status: danglingArtifacts > 0 ? 'error' : 'ok',
    });

    return {
      ...repair,
      danglingArtifacts,
      failedMemories,
      missingIndexes,
      orphanMedia,
    };
  }

  async reclaimExpired(): Promise<number> {
    return this.tasks.reclaimExpired({
      lockTimeoutMs: this.lockTimeoutMs,
      now: new Date(),
    });
  }

  async repairAll(): Promise<void> {
    const [memoryScopes, mediaScopes] = await Promise.all([
      this.tasks.listOwnerScopes(),
      this.attachmentStorage.listOwnerScopes(),
    ]);
    const scopes = new Map(
      [...memoryScopes, ...mediaScopes].map((scope) => [
        `${scope.agentId}\u0000${scope.ownerKey}`,
        scope,
      ]),
    );

    for (const scope of scopes.values()) {
      await this.repairOwner(scope.agentId, scope.ownerKey);
    }
  }
}
