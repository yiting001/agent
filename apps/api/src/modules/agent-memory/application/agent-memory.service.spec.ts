import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import type {
  AgentMemory,
  AgentMemoryMessage,
  AgentMemoryThread,
} from '../domain/agent-memory';
import {
  AgentMemoryRepository,
  type SaveMemoryInput,
} from './agent-memory.repository';
import { AgentMemoryService } from './agent-memory.service';

function config(): ConfigService {
  return {
    getOrThrow: <T>() =>
      ({
        agentMemoryRecallLimit: 4,
        agentMemoryRecentMessageLimit: 6,
      }) satisfies Partial<ApplicationConfig> as T,
  } as unknown as ConfigService;
}

class InMemoryAgentMemoryRepository extends AgentMemoryRepository {
  memories: AgentMemory[] = [];
  messages: AgentMemoryMessage[] = [];
  threads = new Map<string, AgentMemoryThread>();

  clearAgentMemory(agentId: string, ownerKey: string): Promise<void> {
    this.memories = this.memories.filter(
      (memory) => memory.agentId !== agentId || memory.ownerKey !== ownerKey,
    );
    const threadIds = [...this.threads.values()]
      .filter(
        (thread) => thread.agentId === agentId && thread.ownerKey === ownerKey,
      )
      .map((thread) => thread.id);

    for (const threadId of threadIds) {
      this.threads.delete(threadId);
    }

    this.messages = this.messages.filter(
      (message) =>
        message.ownerKey !== ownerKey || !threadIds.includes(message.threadId),
    );

    return Promise.resolve();
  }

  deleteMemory(
    agentId: string,
    ownerKey: string,
    memoryId: string,
  ): Promise<void> {
    this.memories = this.memories.filter(
      (memory) =>
        memory.id !== memoryId ||
        memory.agentId !== agentId ||
        memory.ownerKey !== ownerKey,
    );

    return Promise.resolve();
  }

  appendMessages(
    threadId: string,
    ownerKey: string,
    messages: Array<Pick<AgentMemoryMessage, 'content' | 'role'>>,
  ): Promise<void> {
    if (this.threads.get(threadId)?.ownerKey !== ownerKey) {
      return Promise.resolve();
    }

    const offset = this.messages.filter(
      (message) => message.threadId === threadId,
    ).length;

    this.messages.push(
      ...messages.map((message, index) => ({
        content: message.content,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: `${threadId}-${offset + index + 1}`,
        ownerKey,
        position: offset + index + 1,
        role: message.role,
        threadId,
      })),
    );

    return Promise.resolve();
  }

  findThread(
    id: string,
    ownerKey: string,
  ): Promise<AgentMemoryThread | undefined> {
    const thread = this.threads.get(id);

    return Promise.resolve(thread?.ownerKey === ownerKey ? thread : undefined);
  }

  listMemories(
    agentId: string,
    ownerKey: string,
    limit: number,
  ): Promise<AgentMemory[]> {
    return Promise.resolve(
      this.memories
        .filter(
          (memory) =>
            memory.agentId === agentId && memory.ownerKey === ownerKey,
        )
        .slice(0, limit),
    );
  }

  listRecentMessages(
    threadId: string,
    ownerKey: string,
    limit: number,
  ): Promise<AgentMemoryMessage[]> {
    if (this.threads.get(threadId)?.ownerKey !== ownerKey) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      this.messages
        .filter((message) => message.threadId === threadId)
        .slice(-limit),
    );
  }

  saveMemory(input: SaveMemoryInput): Promise<AgentMemory> {
    const existing = this.memories.find(
      (memory) =>
        memory.agentId === input.agentId &&
        memory.content === input.content &&
        memory.ownerKey === input.ownerKey,
    );

    if (existing) {
      existing.importance = Math.max(existing.importance, input.importance);

      return Promise.resolve(existing);
    }

    const memory: AgentMemory = {
      accessCount: 0,
      agentId: input.agentId,
      content: input.content,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: `memory-${this.memories.length + 1}`,
      importance: input.importance,
      ownerKey: input.ownerKey,
      sourceThreadId: input.sourceThreadId,
      type: input.type,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    this.memories.push(memory);

    return Promise.resolve(memory);
  }

  saveThread(thread: AgentMemoryThread): Promise<void> {
    this.threads.set(thread.id, thread);

    return Promise.resolve();
  }

  touchMemories(ids: string[], at: Date): Promise<void> {
    for (const memory of this.memories) {
      if (ids.includes(memory.id)) {
        memory.accessCount += 1;
        memory.lastAccessedAt = at;
      }
    }

    return Promise.resolve();
  }
}

describe('AgentMemoryService', () => {
  it('组合短期会话消息并召回相关长期记忆', async () => {
    const repository = new InMemoryAgentMemoryRepository();
    const service = new AgentMemoryService(repository, config());

    repository.messages.push({
      content: '我叫张三',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'message-1',
      ownerKey: 'owner-1',
      position: 1,
      role: 'user',
      threadId: 'thread-1',
    });
    repository.threads.set('thread-1', {
      agentId: 'agent-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'thread-1',
      ownerKey: 'owner-1',
      source: 'admin',
      title: '测试会话',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    repository.memories.push({
      accessCount: 0,
      agentId: 'agent-1',
      content: '用户喜欢 TypeScript 示例。',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'memory-1',
      importance: 4,
      ownerKey: 'owner-1',
      type: 'preference',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const context = await service.composeContext({
      agentId: 'agent-1',
      conversationId: 'thread-1',
      incomingMessages: [{ content: '继续讲 TypeScript', role: 'user' }],
      ownerKey: 'owner-1',
      query: 'TypeScript 示例',
    });

    expect(context.messages.map((message) => message.content)).toEqual([
      '我叫张三',
      '继续讲 TypeScript',
    ]);
    expect(context.longTermContext).toContain('用户喜欢 TypeScript 示例。');
    expect(repository.memories[0]?.accessCount).toBe(1);
  });

  it('完成对话后保存短期轮次并提取显式长期记忆', async () => {
    const repository = new InMemoryAgentMemoryRepository();
    const service = new AgentMemoryService(repository, config());

    await service.recordTurn({
      agentId: 'agent-1',
      answer: '我会记住。',
      conversationId: 'thread-1',
      messages: [{ content: '请记住：我喜欢中文回答', role: 'user' }],
      ownerKey: 'owner-1',
      source: 'admin',
    });

    expect(repository.threads.get('thread-1')?.title).toBe(
      '请记住：我喜欢中文回答',
    );
    expect(repository.messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
    ]);
    expect(repository.memories[0]).toMatchObject({
      agentId: 'agent-1',
      content: '用户偏好：中文回答。',
      importance: 5,
      ownerKey: 'owner-1',
      sourceThreadId: 'thread-1',
      type: 'preference',
    });
  });

  it('仅消除客户端历史与服务端历史的重叠部分', async () => {
    const repository = new InMemoryAgentMemoryRepository();
    const service = new AgentMemoryService(repository, config());

    repository.threads.set('thread-1', {
      agentId: 'agent-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'thread-1',
      ownerKey: 'owner-1',
      source: 'admin',
      title: '重复消息',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    repository.messages.push(
      {
        content: '你好',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: 'message-1',
        ownerKey: 'owner-1',
        position: 1,
        role: 'user',
        threadId: 'thread-1',
      },
      {
        content: '你好，请问需要什么帮助？',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: 'message-2',
        ownerKey: 'owner-1',
        position: 2,
        role: 'assistant',
        threadId: 'thread-1',
      },
    );

    const context = await service.composeContext({
      agentId: 'agent-1',
      conversationId: 'thread-1',
      incomingMessages: [
        { content: '你好', role: 'user' },
        { content: '你好，请问需要什么帮助？', role: 'assistant' },
        { content: '你好', role: 'user' },
      ],
      ownerKey: 'owner-1',
      query: '你好',
    });

    expect(context.messages.map((message) => message.content)).toEqual([
      '你好',
      '你好，请问需要什么帮助？',
      '你好',
    ]);
  });

  it('不同 owner 之间不共享会话消息和长期记忆', async () => {
    const repository = new InMemoryAgentMemoryRepository();
    const service = new AgentMemoryService(repository, config());

    repository.threads.set('thread-1', {
      agentId: 'agent-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'thread-1',
      ownerKey: 'owner-a',
      source: 'public',
      title: '私有会话',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    repository.messages.push({
      content: '仅属于 owner-a 的消息',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'message-1',
      ownerKey: 'owner-a',
      position: 1,
      role: 'user',
      threadId: 'thread-1',
    });
    repository.memories.push({
      accessCount: 0,
      agentId: 'agent-1',
      content: '仅属于 owner-a 的偏好',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'memory-1',
      importance: 5,
      ownerKey: 'owner-a',
      type: 'preference',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const context = await service.composeContext({
      agentId: 'agent-1',
      conversationId: 'thread-1',
      incomingMessages: [{ content: '新问题', role: 'user' }],
      ownerKey: 'owner-b',
      query: '偏好',
    });

    expect(context.messages).toEqual([{ content: '新问题', role: 'user' }]);
    expect(context.longTermContext).toBe('未检索到可用长期记忆。');
  });

  it('同一 owner 的会话不能跨智能体读取', async () => {
    const repository = new InMemoryAgentMemoryRepository();
    const service = new AgentMemoryService(repository, config());

    repository.threads.set('thread-1', {
      agentId: 'agent-a',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'thread-1',
      ownerKey: 'owner-1',
      source: 'admin',
      title: '智能体 A 会话',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    repository.messages.push({
      content: '智能体 A 的私有消息',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'message-1',
      ownerKey: 'owner-1',
      position: 1,
      role: 'user',
      threadId: 'thread-1',
    });

    const context = await service.composeContext({
      agentId: 'agent-b',
      conversationId: 'thread-1',
      incomingMessages: [{ content: '智能体 B 的问题', role: 'user' }],
      ownerKey: 'owner-1',
      query: '问题',
    });

    expect(context.messages).toEqual([
      { content: '智能体 B 的问题', role: 'user' },
    ]);
  });

  it('不会把疑问句误识别为用户偏好', async () => {
    const repository = new InMemoryAgentMemoryRepository();
    const service = new AgentMemoryService(repository, config());

    await service.recordTurn({
      agentId: 'agent-1',
      answer: '你喜欢中文回答。',
      messages: [{ content: '我喜欢怎样的回答？', role: 'user' }],
      ownerKey: 'owner-1',
      source: 'admin',
    });

    expect(repository.memories).toEqual([]);
  });
});
