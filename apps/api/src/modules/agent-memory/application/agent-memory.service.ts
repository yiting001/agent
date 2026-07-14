import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import type { ConversationMessage } from '../../chat/domain/chat';
import type {
  AgentMemory,
  AgentMemoryMessage,
  MemorySource,
  MemoryType,
  RecalledMemory,
} from '../domain/agent-memory';
import { AgentMemoryRepository } from './agent-memory.repository';

export interface ComposeMemoryContextInput {
  agentId: string;
  conversationId?: string;
  incomingMessages: ConversationMessage[];
  ownerKey?: string;
  query: string;
}

export interface ComposeMemoryContextResult {
  longTermContext: string;
  messages: ConversationMessage[];
}

export interface RecordTurnInput {
  agentId: string;
  answer: string;
  conversationId?: string;
  messages: ConversationMessage[];
  ownerKey?: string;
  source: MemorySource;
}

interface MemoryCandidate {
  content: string;
  importance: number;
  type: MemoryType;
}

const MEMORY_PREFIX_PATTERNS = [
  /(?:请你)?记住[：:\s]*(.+)/i,
  /remember(?: that)?[：:\s]*(.+)/i,
];

const FACT_PATTERNS: Array<{
  importance: number;
  pattern: RegExp;
  template: (value: string) => string;
  type: MemoryType;
}> = [
  {
    importance: 5,
    pattern: /(?:我叫|我的名字是|我是)\s*([\u4e00-\u9fa5A-Za-z0-9_-]{1,32})/,
    template: (value) => `用户名字是${value}。`,
    type: 'semantic',
  },
  {
    importance: 4,
    pattern: /我(?:喜欢|偏好)\s*([^。！？.!?\n]{2,80})/,
    template: (value) => `用户偏好：${value}。`,
    type: 'preference',
  },
  {
    importance: 4,
    pattern: /我(?:不喜欢|讨厌)\s*([^。！？.!?\n]{2,80})/,
    template: (value) => `用户不偏好：${value}。`,
    type: 'preference',
  },
  {
    importance: 4,
    pattern: /我希望你\s*([^。！？.!?\n]{2,100})/,
    template: (value) => `用户希望助手：${value}。`,
    type: 'preference',
  },
];

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isQuestion(value: string): boolean {
  return (
    /[?？]$/.test(value) || /(?:什么|怎样|如何|是否|吗)[？?]?$/.test(value)
  );
}

function messageKey(
  message: Pick<ConversationMessage, 'content' | 'role'>,
): string {
  return `${message.role}:${normalizeText(message.content)}`;
}

function mergeMessages(
  storedMessages: AgentMemoryMessage[],
  incomingMessages: ConversationMessage[],
  limit: number,
): ConversationMessage[] {
  const stored = storedMessages
    .filter((message) => normalizeText(message.content))
    .map((message) => ({
      content: message.content,
      role: message.role,
    }));
  const incoming = incomingMessages
    .filter((message) => normalizeText(message.content))
    .map(
      (message): ConversationMessage => ({
        attachments: 'attachments' in message ? message.attachments : undefined,
        content: message.content,
        role: message.role,
      }),
    );
  let overlap = Math.min(stored.length, incoming.length);

  while (overlap > 0) {
    const storedTail = stored.slice(-overlap).map(messageKey);
    const incomingHead = incoming.slice(0, overlap).map(messageKey);

    if (storedTail.every((key, index) => key === incomingHead[index])) {
      break;
    }

    overlap -= 1;
  }

  return [...stored, ...incoming.slice(overlap)].slice(-limit);
}

function extractKeywords(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/[^\p{L}\p{N}\u4e00-\u9fa5]+/u)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2),
    ),
  ].slice(0, 12);
}

function scoreMemory(
  content: string,
  query: string,
  keywords: string[],
): number {
  const haystack = content.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let score = 0;

  if (normalizedQuery && haystack.includes(normalizedQuery)) {
    score += 6;
  }

  for (const keyword of keywords) {
    if (haystack.includes(keyword)) {
      score += 2;
    }
  }

  return score;
}

function extractFactCandidate(content: string): MemoryCandidate | undefined {
  for (const rule of FACT_PATTERNS) {
    const value = rule.pattern.exec(content)?.[1]?.trim();

    if (value) {
      return {
        content: rule.template(truncate(value, 120)),
        importance: rule.importance,
        type: rule.type,
      };
    }
  }

  return undefined;
}

function extractMemoryCandidates(
  messages: ConversationMessage[],
): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = [];

  for (const message of messages.filter((item) => item.role === 'user')) {
    const content = normalizeText(message.content);
    let explicitContent = '';

    for (const pattern of MEMORY_PREFIX_PATTERNS) {
      const explicit = pattern.exec(content)?.[1]?.trim();

      if (explicit) {
        explicitContent = truncate(explicit, 240);
        break;
      }
    }

    if (explicitContent) {
      const explicitFact = extractFactCandidate(explicitContent);

      candidates.push(
        explicitFact
          ? { ...explicitFact, importance: 5 }
          : {
              content: explicitContent,
              importance: 5,
              type: 'semantic',
            },
      );
      continue;
    }

    if (isQuestion(content)) {
      continue;
    }

    const fact = extractFactCandidate(content);

    if (fact) {
      candidates.push(fact);
    }
  }

  return candidates.filter(
    (candidate, index) =>
      candidates.findIndex((item) => item.content === candidate.content) ===
      index,
  );
}

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);
  private readonly recallLimit: number;
  private readonly recentMessageLimit: number;

  constructor(
    private readonly repository: AgentMemoryRepository,
    configService: ConfigService,
  ) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.recallLimit = config.agentMemoryRecallLimit;
    this.recentMessageLimit = config.agentMemoryRecentMessageLimit;
  }

  async composeContext(
    input: ComposeMemoryContextInput,
  ): Promise<ComposeMemoryContextResult> {
    try {
      const [storedMessages, memories] = await Promise.all([
        input.conversationId && input.ownerKey
          ? this.loadRecentMessages(
              input.agentId,
              input.conversationId,
              input.ownerKey,
            )
          : Promise.resolve([]),
        input.ownerKey
          ? this.recall(input.agentId, input.ownerKey, input.query)
          : Promise.resolve([]),
      ]);

      return {
        longTermContext: this.formatLongTermContext(memories),
        messages: mergeMessages(
          storedMessages,
          input.incomingMessages,
          this.recentMessageLimit,
        ),
      };
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : '记忆读取发生未知错误',
          operation: 'agent_memory.compose_context',
        }),
      );

      return {
        longTermContext: this.formatLongTermContext([]),
        messages: input.incomingMessages.slice(-this.recentMessageLimit),
      };
    }
  }

  listAgentMemories(agentId: string, ownerKey: string): Promise<AgentMemory[]> {
    return this.repository.listMemories(agentId, ownerKey, 100);
  }

  clearAgentMemory(agentId: string, ownerKey: string): Promise<void> {
    return this.repository.clearAgentMemory(agentId, ownerKey);
  }

  deleteMemory(
    agentId: string,
    ownerKey: string,
    memoryId: string,
  ): Promise<void> {
    return this.repository.deleteMemory(agentId, ownerKey, memoryId);
  }

  private async loadRecentMessages(
    agentId: string,
    conversationId: string,
    ownerKey: string,
  ): Promise<AgentMemoryMessage[]> {
    const thread = await this.repository.findThread(conversationId, ownerKey);

    if (!thread || thread.agentId !== agentId) {
      return [];
    }

    return this.repository.listRecentMessages(
      conversationId,
      ownerKey,
      this.recentMessageLimit,
    );
  }

  async recordTurn(input: RecordTurnInput): Promise<void> {
    const ownerKey = input.ownerKey;

    if (!ownerKey) {
      return;
    }

    const latestUserMessage = [...input.messages]
      .reverse()
      .find((message) => message.role === 'user');
    const messagesToSave: Array<Pick<AgentMemoryMessage, 'content' | 'role'>> =
      [];

    if (input.conversationId && latestUserMessage) {
      await this.ensureThread(
        input.conversationId,
        input.agentId,
        ownerKey,
        input.source,
        latestUserMessage.content,
      );
      messagesToSave.push({
        content: latestUserMessage.content,
        role: 'user',
      });
      messagesToSave.push({ content: input.answer, role: 'assistant' });
      await this.repository.appendMessages(
        input.conversationId,
        ownerKey,
        messagesToSave,
      );
    }

    await Promise.all(
      extractMemoryCandidates(latestUserMessage ? [latestUserMessage] : []).map(
        (candidate) =>
          this.repository.saveMemory({
            agentId: input.agentId,
            content: candidate.content,
            importance: candidate.importance,
            ownerKey,
            sourceThreadId: input.conversationId,
            type: candidate.type,
          }),
      ),
    );
  }

  private async ensureThread(
    id: string,
    agentId: string,
    ownerKey: string,
    source: MemorySource,
    firstUserMessage: string,
  ): Promise<void> {
    const existing = await this.repository.findThread(id, ownerKey);

    if (existing && existing.agentId !== agentId) {
      throw new Error('conversationId 已被其他智能体使用。');
    }

    const now = new Date();

    await this.repository.saveThread({
      agentId,
      createdAt: existing?.createdAt ?? now,
      id,
      ownerKey,
      source: existing?.source ?? source,
      title:
        existing?.title || truncate(firstUserMessage.trim(), 40) || '新对话',
      updatedAt: now,
    });
  }

  private formatLongTermContext(memories: RecalledMemory[]): string {
    if (memories.length === 0) {
      return '未检索到可用长期记忆。';
    }

    return memories
      .map(
        (memory, index) =>
          `[记忆 ${index + 1}｜${memory.type}] ${memory.content}`,
      )
      .join('\n');
  }

  private async recall(
    agentId: string,
    ownerKey: string,
    query: string,
  ): Promise<RecalledMemory[]> {
    const memories = await this.repository.listMemories(agentId, ownerKey, 100);
    const keywords = extractKeywords(query);
    const scored = memories
      .map((memory) => ({
        content: memory.content,
        id: memory.id,
        score:
          scoreMemory(memory.content, query, keywords) +
          memory.importance +
          Math.min(memory.accessCount, 3),
        type: memory.type,
      }))
      .filter((memory) => memory.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, this.recallLimit);

    await this.repository.touchMemories(
      scored.map((memory) => memory.id),
      new Date(),
    );

    return scored;
  }
}
