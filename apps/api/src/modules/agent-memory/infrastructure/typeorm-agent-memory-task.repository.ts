import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';

import type { AgentMemory, AgentMemoryArtifact } from '../domain/agent-memory';
import type {
  AgentMemoryTask,
  AgentMemoryTaskStatus,
} from '../domain/agent-memory-task';
import {
  AgentMemoryTaskRepository,
  type AgentMemoryConsistencyRepair,
  type AgentMemoryHealth,
  type AgentMemoryOwnerScope,
  type EnqueueEpisodeInput,
} from '../application/agent-memory-task.repository';
import { AgentMemoryArtifactEntity } from './agent-memory-artifact.entity';
import { toMemory, toTask } from './agent-memory-persistence.mapper';
import { AgentMemoryEntity } from './agent-memory.entity';
import { AgentMemoryTaskEntity } from './agent-memory-task.entity';
import { TypeOrmAgentMemoryTaskMaintenanceStore } from './typeorm-agent-memory-task-maintenance.store';

@Injectable()
export class TypeOrmAgentMemoryTaskRepository extends AgentMemoryTaskRepository {
  constructor(
    @InjectRepository(AgentMemoryTaskEntity)
    private readonly tasks: Repository<AgentMemoryTaskEntity>,
    private readonly dataSource: DataSource,
    private readonly maintenance: TypeOrmAgentMemoryTaskMaintenanceStore,
  ) {
    super();
  }

  async claimNextTask(input: {
    lockOwner: string;
    now: Date;
  }): Promise<AgentMemoryTask | undefined> {
    const result = await this.tasks
      .createQueryBuilder()
      .update(AgentMemoryTaskEntity)
      .set({
        attempts: () => '"attempts" + 1',
        lastError: null,
        lockedAt: input.now,
        lockOwner: input.lockOwner,
        status: 'processing',
        updatedAt: input.now,
      })
      .where(
        `"id" = (
            SELECT "id" FROM "agent_memory_tasks"
            WHERE "status" = :status AND "nextRunAt" <= :now
            ORDER BY "nextRunAt" ASC, "createdAt" ASC
            LIMIT 1
          )`,
        { now: input.now, status: 'queued' },
      )
      .andWhere('"status" = :status', { status: 'queued' })
      .execute();

    if ((result.affected ?? 0) < 1) {
      return undefined;
    }

    const entity = await this.tasks.findOne({
      order: { updatedAt: 'DESC' },
      where: {
        lockOwner: input.lockOwner,
        status: 'processing',
        updatedAt: input.now,
      },
    });

    return entity ? toTask(entity) : undefined;
  }

  async completeExtraction(input: {
    content: string;
    importance: number;
    maxAttempts: number;
    now: Date;
    task: AgentMemoryTask;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.completeTask(manager.getRepository(AgentMemoryTaskEntity), {
        now: input.now,
        task: input.task,
      });
      await manager.getRepository(AgentMemoryEntity).update(
        {
          agentId: input.task.agentId,
          id: input.task.memoryId,
          ownerKey: input.task.ownerKey,
        },
        {
          content: input.content,
          importance: input.importance,
          status: 'ready',
          updatedAt: input.now,
        },
      );
      await this.ensureTask(manager.getRepository(AgentMemoryTaskEntity), {
        agentId: input.task.agentId,
        kind: 'index',
        maxAttempts: input.maxAttempts,
        memoryId: input.task.memoryId,
        now: input.now,
        ownerKey: input.task.ownerKey,
      });
    });
  }

  async completeIndex(input: {
    indexedAt: Date;
    task: AgentMemoryTask;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.completeTask(manager.getRepository(AgentMemoryTaskEntity), {
        now: input.indexedAt,
        task: input.task,
      });
      await manager.getRepository(AgentMemoryEntity).update(
        {
          agentId: input.task.agentId,
          id: input.task.memoryId,
          ownerKey: input.task.ownerKey,
        },
        {
          indexedAt: input.indexedAt,
          updatedAt: input.indexedAt,
        },
      );
    });
  }

  async enqueueEpisode(input: EnqueueEpisodeInput): Promise<AgentMemory> {
    return this.dataSource.transaction(async (manager) => {
      const memories = manager.getRepository(AgentMemoryEntity);
      const existing = await memories.findOne({
        where: {
          agentId: input.agentId,
          idempotencyKey: input.idempotencyKey,
          ownerKey: input.ownerKey,
          type: 'episodic',
        },
      });

      if (existing) {
        await this.ensureTask(manager.getRepository(AgentMemoryTaskEntity), {
          agentId: existing.agentId,
          kind: existing.status === 'ready' ? 'index' : 'extract',
          maxAttempts: input.maxAttempts,
          memoryId: existing.id,
          now: input.now,
          ownerKey: existing.ownerKey,
        });

        return toMemory(existing);
      }

      const memoryId = randomUUID();
      const memory = memories.create({
        accessCount: 0,
        agentId: input.agentId,
        content: input.content,
        createdAt: input.now,
        id: memoryId,
        idempotencyKey: input.idempotencyKey,
        importance: 1,
        ownerKey: input.ownerKey,
        sourceThreadId: input.sourceThreadId,
        status: 'pending',
        type: 'episodic',
        updatedAt: input.now,
      });

      await memories
        .createQueryBuilder()
        .insert()
        .into(AgentMemoryEntity)
        .values(memory)
        .orIgnore()
        .execute();
      const persisted = await memories.findOne({
        where: {
          agentId: input.agentId,
          idempotencyKey: input.idempotencyKey,
          ownerKey: input.ownerKey,
          type: 'episodic',
        },
      });

      if (!persisted) {
        throw new Error('图片情景记忆幂等写入失败。');
      }

      if (persisted.id !== memoryId) {
        await this.ensureTask(manager.getRepository(AgentMemoryTaskEntity), {
          agentId: persisted.agentId,
          kind: persisted.status === 'ready' ? 'index' : 'extract',
          maxAttempts: input.maxAttempts,
          memoryId: persisted.id,
          now: input.now,
          ownerKey: persisted.ownerKey,
        });

        return toMemory(persisted);
      }

      await manager.getRepository(AgentMemoryArtifactEntity).save(
        input.artifacts.map((artifact) =>
          manager.getRepository(AgentMemoryArtifactEntity).create({
            ...artifact,
            createdAt: input.now,
            id: randomUUID(),
            memoryId,
          }),
        ),
      );
      await this.ensureTask(manager.getRepository(AgentMemoryTaskEntity), {
        agentId: input.agentId,
        kind: 'extract',
        maxAttempts: input.maxAttempts,
        memoryId,
        now: input.now,
        ownerKey: input.ownerKey,
      });

      return toMemory(persisted);
    });
  }

  async failTask(input: {
    dead: boolean;
    errorMessage: string;
    nextRunAt: Date;
    task: AgentMemoryTask;
  }): Promise<void> {
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const result = await manager.getRepository(AgentMemoryTaskEntity).update(
        {
          id: input.task.id,
          lockOwner: input.task.lockOwner,
          status: 'processing',
        },
        {
          completedAt: input.dead ? now : null,
          lastError: input.errorMessage,
          lockedAt: null,
          lockOwner: null,
          nextRunAt: input.nextRunAt,
          status: input.dead ? 'dead' : 'queued',
          updatedAt: now,
        },
      );

      if ((result.affected ?? 0) !== 1) {
        return;
      }

      if (input.dead && input.task.kind === 'extract') {
        await manager.getRepository(AgentMemoryEntity).update(
          {
            agentId: input.task.agentId,
            id: input.task.memoryId,
            ownerKey: input.task.ownerKey,
          },
          {
            status: 'failed',
            updatedAt: now,
          },
        );
      }
    });
  }

  async getHealth(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryHealth> {
    return this.maintenance.getHealth(agentId, ownerKey);
  }

  async listDanglingArtifactCandidates(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryArtifact[]> {
    return this.maintenance.listDanglingArtifactCandidates(agentId, ownerKey);
  }

  async listReadyMemories(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemory[]> {
    return this.maintenance.listReadyMemories(agentId, ownerKey);
  }

  async listOwnerScopes(): Promise<AgentMemoryOwnerScope[]> {
    return this.maintenance.listOwnerScopes();
  }

  async listTasks(input: {
    agentId: string;
    ownerKey: string;
    status?: AgentMemoryTaskStatus;
  }): Promise<AgentMemoryTask[]> {
    return this.maintenance.listTasks(input);
  }

  async markMemoryFailed(input: {
    agentId: string;
    memoryId: string;
    now: Date;
    ownerKey: string;
    reason: string;
  }): Promise<void> {
    return this.maintenance.markMemoryFailed(input);
  }

  async reconcileOwner(input: {
    agentId: string;
    maxAttempts: number;
    now: Date;
    olderThan: Date;
    ownerKey: string;
  }): Promise<AgentMemoryConsistencyRepair> {
    return this.maintenance.reconcileOwner(input);
  }

  async reclaimExpired(input: {
    lockTimeoutMs: number;
    now: Date;
  }): Promise<number> {
    return this.maintenance.reclaimExpired(input);
  }

  async recoverTasks(input: {
    agentId: string;
    maxAttempts: number;
    memoryId?: string;
    now: Date;
    ownerKey: string;
  }): Promise<number> {
    return this.maintenance.recoverTasks(input);
  }

  async repairMissingIndex(input: {
    agentId: string;
    maxAttempts: number;
    memoryId: string;
    now: Date;
    ownerKey: string;
  }): Promise<void> {
    return this.maintenance.repairMissingIndex(input);
  }

  async saveTaskEmbedding(input: {
    dimensions: number;
    task: AgentMemoryTask;
    vector: number[];
  }): Promise<void> {
    await this.tasks.update(
      {
        agentId: input.task.agentId,
        id: input.task.id,
        lockOwner: input.task.lockOwner,
        ownerKey: input.task.ownerKey,
        status: 'processing',
      },
      {
        embeddingDimensions: input.dimensions,
        embeddingJson: JSON.stringify(input.vector),
        updatedAt: new Date(),
      },
    );
  }

  private async completeTask(
    tasks: Repository<AgentMemoryTaskEntity>,
    input: { now: Date; task: AgentMemoryTask },
  ): Promise<void> {
    const result = await tasks.update(
      {
        id: input.task.id,
        lockOwner: input.task.lockOwner,
        status: 'processing',
      },
      {
        completedAt: input.now,
        lockedAt: null,
        lockOwner: null,
        status: 'succeeded',
        updatedAt: input.now,
      },
    );

    if ((result.affected ?? 0) !== 1) {
      throw new Error('情景记忆任务 lease 已失效。');
    }
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
