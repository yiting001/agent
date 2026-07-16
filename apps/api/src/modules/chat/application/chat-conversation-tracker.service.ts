import { Injectable, Logger } from '@nestjs/common';

import { AgentEpisodicMemoryService } from '../../agent-memory/application/agent-episodic-memory.service';
import { AgentMemoryService } from '../../agent-memory/application/agent-memory.service';
import { AgentMemoryTaskDispatcher } from '../../agent-memory/application/agent-memory-task.dispatcher';
import { AgentRepository } from '../../agents/application/agent.repository';
import {
  GenerationCaptureService,
  type GenerationCaptureIdentity,
} from '../../observability/application/generation-capture.service';
import type { ConversationMessage } from '../domain/chat';

export interface TrackChatConversationInput {
  agentId: string;
  conversationId?: string;
  memoryOwnerKey?: string;
  messages: ConversationMessage[];
  source: 'admin' | 'api' | 'evaluation' | 'public';
}

type PersistedChatConversationInput = Omit<
  TrackChatConversationInput,
  'source'
> & {
  source: Exclude<TrackChatConversationInput['source'], 'evaluation'>;
};

/** 在流最终结束后统一提交 generation、计数和记忆副作用。 */
@Injectable()
export class ChatConversationTracker {
  private readonly logger = new Logger(ChatConversationTracker.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMemory: AgentMemoryService,
    private readonly episodicMemory: AgentEpisodicMemoryService,
    private readonly memoryTaskDispatcher: AgentMemoryTaskDispatcher,
    private readonly generationCapture: GenerationCaptureService,
  ) {}

  async *track(
    command: TrackChatConversationInput,
    content: AsyncIterable<string>,
    generation: GenerationCaptureIdentity,
  ): AsyncIterable<string> {
    let answer = '';
    let completed = false;
    let failed = false;

    try {
      for await (const delta of content) {
        answer += delta;
        yield delta;
      }

      completed = true;
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      await this.finishGeneration(generation, answer, completed, failed);

      if (completed && command.source !== 'evaluation') {
        await this.agentRepository.incrementConversationCount(command.agentId);
        const persistedCommand: PersistedChatConversationInput = {
          ...command,
          source: command.source,
        };

        await this.recordMemory(persistedCommand, answer);
        await this.recordEpisode(persistedCommand, answer);
      }
    }
  }

  private finishGeneration(
    generation: GenerationCaptureIdentity,
    answer: string,
    completed: boolean,
    failed: boolean,
  ): Promise<void> {
    if (completed) {
      return this.generationCapture.complete(generation.generationId, answer);
    }

    return failed
      ? this.generationCapture.fail(generation.generationId, answer)
      : this.generationCapture.cancel(generation.generationId, answer);
  }

  private async recordMemory(
    command: PersistedChatConversationInput,
    answer: string,
  ): Promise<void> {
    try {
      await this.agentMemory.recordTurn({
        agentId: command.agentId,
        answer,
        conversationId: command.conversationId,
        messages: command.messages,
        ownerKey: command.memoryOwnerKey,
        source: command.source,
      });
    } catch (error) {
      this.logFailure(
        'agent_memory.record_turn',
        error,
        '记忆写入发生未知错误',
      );
    }
  }

  private async recordEpisode(
    command: PersistedChatConversationInput,
    answer: string,
  ): Promise<void> {
    try {
      const taskEnqueued = await this.episodicMemory.recordEpisode({
        agentId: command.agentId,
        answer,
        conversationId: command.conversationId,
        messages: command.messages,
        ownerKey: command.memoryOwnerKey,
      });

      if (taskEnqueued) {
        this.memoryTaskDispatcher.dispatch();
      }
    } catch (error) {
      this.logFailure(
        'agent_memory.record_episode',
        error,
        '图片情景记忆写入发生未知错误',
      );
    }
  }

  private logFailure(
    operation: string,
    error: unknown,
    fallback: string,
  ): void {
    this.logger.warn(
      JSON.stringify({
        error: error instanceof Error ? error.message : fallback,
        operation,
      }),
    );
  }
}
