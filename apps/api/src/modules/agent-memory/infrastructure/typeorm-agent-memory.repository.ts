import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';

import type {
  AgentMemory,
  AgentMemoryMessage,
  AgentMemoryThread,
} from '../domain/agent-memory';
import {
  AgentMemoryRepository,
  type SaveMemoryInput,
} from '../application/agent-memory.repository';
import { AgentMemoryEntity } from './agent-memory.entity';
import { AgentMemoryMessageEntity } from './agent-memory-message.entity';
import { AgentMemoryThreadEntity } from './agent-memory-thread.entity';

function toThread(entity: AgentMemoryThreadEntity): AgentMemoryThread {
  return {
    agentId: entity.agentId,
    createdAt: entity.createdAt,
    id: entity.id,
    ownerKey: entity.ownerKey,
    source: entity.source,
    title: entity.title,
    updatedAt: entity.updatedAt,
  };
}

function toMessage(entity: AgentMemoryMessageEntity): AgentMemoryMessage {
  return {
    content: entity.content,
    createdAt: entity.createdAt,
    id: entity.id,
    ownerKey: entity.ownerKey,
    position: entity.position,
    role: entity.role,
    threadId: entity.threadId,
  };
}

function toMemory(entity: AgentMemoryEntity): AgentMemory {
  return {
    accessCount: entity.accessCount,
    agentId: entity.agentId,
    content: entity.content,
    createdAt: entity.createdAt,
    id: entity.id,
    importance: entity.importance,
    lastAccessedAt: entity.lastAccessedAt,
    ownerKey: entity.ownerKey,
    sourceThreadId: entity.sourceThreadId,
    type: entity.type,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class TypeOrmAgentMemoryRepository extends AgentMemoryRepository {
  constructor(
    @InjectRepository(AgentMemoryEntity)
    private readonly memories: Repository<AgentMemoryEntity>,
    @InjectRepository(AgentMemoryMessageEntity)
    private readonly messages: Repository<AgentMemoryMessageEntity>,
    @InjectRepository(AgentMemoryThreadEntity)
    private readonly threads: Repository<AgentMemoryThreadEntity>,
  ) {
    super();
  }

  async clearAgentMemory(agentId: string, ownerKey: string): Promise<void> {
    const threads = await this.threads.find({
      select: { id: true, ownerKey: true },
      where: { agentId, ownerKey },
    });

    if (threads.length > 0) {
      await this.messages.delete({
        ownerKey,
        threadId: In(threads.map((thread) => thread.id)),
      });
      await this.threads.delete({ agentId, ownerKey });
    }

    await this.memories.delete({ agentId, ownerKey });
  }

  async deleteMemory(
    agentId: string,
    ownerKey: string,
    memoryId: string,
  ): Promise<void> {
    await this.memories.delete({ agentId, id: memoryId, ownerKey });
  }

  async appendMessages(
    threadId: string,
    ownerKey: string,
    messages: Array<Pick<AgentMemoryMessage, 'content' | 'role'>>,
  ): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    if (!(await this.findThread(threadId, ownerKey))) {
      return;
    }

    const existingCount = await this.messages.count({
      where: { ownerKey, threadId },
    });
    const now = new Date();
    const recent = await this.listRecentMessages(
      threadId,
      ownerKey,
      messages.length,
    );
    const recentKeys = recent.map((message) => this.messageKey(message));
    const incomingKeys = messages.map((message) => this.messageKey(message));

    if (recentKeys.join('\n') === incomingKeys.join('\n')) {
      return;
    }

    await this.messages.save(
      messages.map((message, index) =>
        this.messages.create({
          content: message.content,
          createdAt: now,
          id: randomUUID(),
          ownerKey,
          position: existingCount + index + 1,
          role: message.role,
          threadId,
        }),
      ),
    );
  }

  async findThread(
    id: string,
    ownerKey: string,
  ): Promise<AgentMemoryThread | undefined> {
    const entity = await this.threads.findOne({ where: { id, ownerKey } });

    return entity ? toThread(entity) : undefined;
  }

  async listMemories(
    agentId: string,
    ownerKey: string,
    limit: number,
  ): Promise<AgentMemory[]> {
    const entities = await this.memories.find({
      order: { importance: 'DESC', updatedAt: 'DESC' },
      take: limit,
      where: { agentId, ownerKey },
    });

    return entities.map(toMemory);
  }

  async listRecentMessages(
    threadId: string,
    ownerKey: string,
    limit: number,
  ): Promise<AgentMemoryMessage[]> {
    if (!(await this.findThread(threadId, ownerKey))) {
      return [];
    }

    const entities = await this.messages.find({
      order: { position: 'DESC' },
      take: limit,
      where: { ownerKey, threadId },
    });

    return entities.reverse().map(toMessage);
  }

  async saveMemory(input: SaveMemoryInput): Promise<AgentMemory> {
    const existing = await this.memories.findOne({
      where: {
        agentId: input.agentId,
        content: input.content,
        ownerKey: input.ownerKey,
      },
    });
    const now = new Date();
    const entity = this.memories.create({
      accessCount: existing?.accessCount ?? 0,
      agentId: input.agentId,
      content: input.content,
      createdAt: existing?.createdAt ?? now,
      id: existing?.id ?? randomUUID(),
      importance: Math.max(existing?.importance ?? 0, input.importance),
      lastAccessedAt: existing?.lastAccessedAt,
      ownerKey: input.ownerKey,
      sourceThreadId: existing?.sourceThreadId ?? input.sourceThreadId,
      type: input.type,
      updatedAt: now,
    });

    return toMemory(await this.memories.save(entity));
  }

  async saveThread(thread: AgentMemoryThread): Promise<void> {
    await this.threads.save(this.threads.create(thread));
  }

  async touchMemories(ids: string[], at: Date): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const memories = await this.memories.find({ where: { id: In(ids) } });

    await this.memories.save(
      memories.map((memory) =>
        this.memories.create({
          ...memory,
          accessCount: memory.accessCount + 1,
          lastAccessedAt: at,
          updatedAt: at,
        }),
      ),
    );
  }

  private messageKey(
    message: Pick<AgentMemoryMessage, 'content' | 'role'>,
  ): string {
    return `${message.role}:${message.content.trim()}`;
  }
}
