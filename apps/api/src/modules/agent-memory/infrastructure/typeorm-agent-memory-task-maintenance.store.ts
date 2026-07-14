import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, In, IsNull, LessThan, type Repository } from 'typeorm';

import type {
  AgentMemoryConsistencyRepair,
  AgentMemoryHealth,
  AgentMemoryOwnerScope,
} from '../application/agent-memory-task.repository';
import type { AgentMemory, AgentMemoryArtifact } from '../domain/agent-memory';
import type {
  AgentMemoryTask,
  AgentMemoryTaskStatus,
} from '../domain/agent-memory-task';
import { AgentMemoryArtifactEntity } from './agent-memory-artifact.entity';
import {
  toArtifact,
  toMemory,
  toTask,
} from './agent-memory-persistence.mapper';
import { AgentMemoryTaskEntity } from './agent-memory-task.entity';
import { AgentMemoryEntity } from './agent-memory.entity';

@Injectable()
export class TypeOrmAgentMemoryTaskMaintenanceStore {
  constructor(private readonly dataSource: DataSource) {}

  async getHealth(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryHealth> {
    const tasks = this.dataSource.getRepository(AgentMemoryTaskEntity);
    const memories = this.dataSource.getRepository(AgentMemoryEntity);
    const [
      queuedTasks,
      processingTasks,
      deadTasks,
      pendingMemories,
      readyWithoutIndex,
    ] = await Promise.all([
      tasks.count({ where: { agentId, ownerKey, status: 'queued' } }),
      tasks.count({ where: { agentId, ownerKey, status: 'processing' } }),
      tasks.count({ where: { agentId, ownerKey, status: 'dead' } }),
      memories.count({
        where: { agentId, ownerKey, status: 'pending', type: 'episodic' },
      }),
      memories.count({
        where: {
          agentId,
          indexedAt: IsNull(),
          ownerKey,
          status: 'ready',
          type: 'episodic',
        },
      }),
    ]);

    return {
      danglingArtifacts: 0,
      deadTasks,
      missingIndexes: 0,
      orphanMedia: 0,
      pendingMemories,
      processingTasks,
      queuedTasks,
      readyWithoutIndex,
    };
  }

  async listDanglingArtifactCandidates(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryArtifact[]> {
    const entities = await this.dataSource
      .getRepository(AgentMemoryArtifactEntity)
      .find({
        order: { createdAt: 'ASC' },
        where: { agentId, ownerKey },
      });

    return entities.map(toArtifact);
  }

  async listReadyMemories(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemory[]> {
    const entities = await this.dataSource
      .getRepository(AgentMemoryEntity)
      .find({
        order: { updatedAt: 'ASC' },
        take: 100,
        where: { agentId, ownerKey, status: 'ready', type: 'episodic' },
      });

    return entities.map(toMemory);
  }

  async listOwnerScopes(): Promise<AgentMemoryOwnerScope[]> {
    return this.dataSource
      .getRepository(AgentMemoryEntity)
      .createQueryBuilder('memory')
      .select('memory.agentId', 'agentId')
      .addSelect('memory.ownerKey', 'ownerKey')
      .where('memory.type = :type', { type: 'episodic' })
      .distinct(true)
      .limit(100)
      .getRawMany<AgentMemoryOwnerScope>();
  }

  async listTasks(input: {
    agentId: string;
    ownerKey: string;
    status?: AgentMemoryTaskStatus;
  }): Promise<AgentMemoryTask[]> {
    const entities = await this.dataSource
      .getRepository(AgentMemoryTaskEntity)
      .find({
        order: { createdAt: 'DESC' },
        take: 100,
        where: {
          agentId: input.agentId,
          ownerKey: input.ownerKey,
          ...(input.status ? { status: input.status } : {}),
        },
      });

    return entities.map(toTask);
  }

  async markMemoryFailed(input: {
    agentId: string;
    memoryId: string;
    now: Date;
    ownerKey: string;
    reason: string;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(AgentMemoryEntity).update(
        {
          agentId: input.agentId,
          id: input.memoryId,
          ownerKey: input.ownerKey,
        },
        { status: 'failed', updatedAt: input.now },
      );
      await manager.getRepository(AgentMemoryTaskEntity).update(
        {
          agentId: input.agentId,
          memoryId: input.memoryId,
          ownerKey: input.ownerKey,
          status: In(['queued', 'processing']),
        },
        {
          completedAt: input.now,
          lastError: input.reason,
          lockedAt: null,
          lockOwner: null,
          status: 'dead',
          updatedAt: input.now,
        },
      );
    });
  }

  async reconcileOwner(input: {
    agentId: string;
    maxAttempts: number;
    now: Date;
    olderThan: Date;
    ownerKey: string;
  }): Promise<AgentMemoryConsistencyRepair> {
    return this.dataSource.transaction(async (manager) => {
      const memories = manager.getRepository(AgentMemoryEntity);
      const tasks = manager.getRepository(AgentMemoryTaskEntity);
      const pending = await memories.find({
        where: {
          agentId: input.agentId,
          ownerKey: input.ownerKey,
          status: 'pending',
          type: 'episodic',
          updatedAt: LessThan(input.olderThan),
        },
      });
      const ready = await memories.find({
        where: {
          agentId: input.agentId,
          indexedAt: IsNull(),
          ownerKey: input.ownerKey,
          status: 'ready',
          type: 'episodic',
        },
      });
      let queuedExtractTasks = 0;
      let queuedIndexTasks = 0;

      for (const memory of pending) {
        if (
          await this.ensureTask(tasks, {
            agentId: memory.agentId,
            kind: 'extract',
            maxAttempts: input.maxAttempts,
            memoryId: memory.id,
            now: input.now,
            ownerKey: memory.ownerKey,
          })
        ) {
          queuedExtractTasks += 1;
        }
      }

      for (const memory of ready) {
        if (
          await this.ensureTask(tasks, {
            agentId: memory.agentId,
            kind: 'index',
            maxAttempts: input.maxAttempts,
            memoryId: memory.id,
            now: input.now,
            ownerKey: memory.ownerKey,
          })
        ) {
          queuedIndexTasks += 1;
        }
      }

      return {
        danglingArtifacts: 0,
        expiredProcessingTasks: 0,
        failedMemories: 0,
        missingIndexes: 0,
        orphanMedia: 0,
        queuedExtractTasks,
        queuedIndexTasks,
      };
    });
  }

  async reclaimExpired(input: {
    lockTimeoutMs: number;
    now: Date;
  }): Promise<number> {
    const result = await this.dataSource
      .getRepository(AgentMemoryTaskEntity)
      .update(
        {
          lockedAt: LessThan(
            new Date(input.now.getTime() - input.lockTimeoutMs),
          ),
          status: 'processing',
        },
        {
          lockedAt: null,
          lockOwner: null,
          nextRunAt: input.now,
          status: 'queued',
          updatedAt: input.now,
        },
      );

    return result.affected ?? 0;
  }

  async recoverTasks(input: {
    agentId: string;
    maxAttempts: number;
    memoryId?: string;
    now: Date;
    ownerKey: string;
  }): Promise<number> {
    const recoveredDead = await this.dataSource.transaction(async (manager) => {
      const tasks = manager.getRepository(AgentMemoryTaskEntity);
      const dead = await tasks.find({
        where: {
          agentId: input.agentId,
          ...(input.memoryId ? { memoryId: input.memoryId } : {}),
          ownerKey: input.ownerKey,
          status: 'dead',
        },
      });

      await tasks.save(
        dead.map((task) =>
          tasks.create({
            ...task,
            attempts: 0,
            completedAt: null,
            lastError: null,
            lockedAt: null,
            lockOwner: null,
            maxAttempts: input.maxAttempts,
            nextRunAt: input.now,
            status: 'queued',
            updatedAt: input.now,
          }),
        ),
      );
      await manager.getRepository(AgentMemoryEntity).update(
        {
          agentId: input.agentId,
          ...(input.memoryId ? { id: input.memoryId } : {}),
          ownerKey: input.ownerKey,
          status: 'failed',
          type: 'episodic',
        },
        { status: 'pending', updatedAt: input.now },
      );

      return dead.length;
    });
    const repair = await this.reconcileOwner({
      agentId: input.agentId,
      maxAttempts: input.maxAttempts,
      now: input.now,
      olderThan: input.now,
      ownerKey: input.ownerKey,
    });

    return recoveredDead + repair.queuedExtractTasks + repair.queuedIndexTasks;
  }

  async repairMissingIndex(input: {
    agentId: string;
    maxAttempts: number;
    memoryId: string;
    now: Date;
    ownerKey: string;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(AgentMemoryEntity).update(
        {
          agentId: input.agentId,
          id: input.memoryId,
          ownerKey: input.ownerKey,
          status: 'ready',
          type: 'episodic',
        },
        { indexedAt: null, updatedAt: input.now },
      );
      const tasks = manager.getRepository(AgentMemoryTaskEntity);
      const existing = await tasks.findOne({
        where: { kind: 'index', memoryId: input.memoryId },
      });

      if (existing) {
        await tasks.save(
          tasks.create({
            ...existing,
            attempts: 0,
            completedAt: null,
            lastError: null,
            lockedAt: null,
            lockOwner: null,
            maxAttempts: input.maxAttempts,
            nextRunAt: input.now,
            status: 'queued',
            updatedAt: input.now,
          }),
        );
        return;
      }

      await this.ensureTask(tasks, {
        agentId: input.agentId,
        kind: 'index',
        maxAttempts: input.maxAttempts,
        memoryId: input.memoryId,
        now: input.now,
        ownerKey: input.ownerKey,
      });
    });
  }

  private async ensureTask(
    tasks: Repository<AgentMemoryTaskEntity>,
    input: {
      agentId: string;
      kind: AgentMemoryTask['kind'];
      maxAttempts: number;
      memoryId: string;
      now: Date;
      ownerKey: string;
    },
  ): Promise<boolean> {
    const existing = await tasks.findOne({
      where: { kind: input.kind, memoryId: input.memoryId },
    });

    if (existing) {
      return false;
    }

    await tasks.save(
      tasks.create({
        agentId: input.agentId,
        attempts: 0,
        createdAt: input.now,
        id: randomUUID(),
        kind: input.kind,
        maxAttempts: input.maxAttempts,
        memoryId: input.memoryId,
        nextRunAt: input.now,
        ownerKey: input.ownerKey,
        status: 'queued',
        updatedAt: input.now,
      }),
    );

    return true;
  }
}
