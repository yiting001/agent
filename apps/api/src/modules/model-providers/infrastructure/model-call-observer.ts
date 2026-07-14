import { Injectable } from '@nestjs/common';
import { performance } from 'node:perf_hooks';

import { ObservabilityService } from '../../observability/application/observability.service';
import type {
  ChatMessageInput,
  ChatToolDefinition,
  ToolLoopMessage,
} from '../application/model-gateway';

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ModelCallDescriptor {
  estimatedInputTokens: number;
  inputCostPerMillionTokens?: number;
  metadata?: Record<string, string | number | boolean>;
  model: string;
  operation: string;
  outputCostPerMillionTokens?: number;
  providerId?: string;
}

function isCjkCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;

  return (
    (codePoint >= 0x3400 && codePoint <= 0x9fff) ||
    (codePoint >= 0x3040 && codePoint <= 0x30ff) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7af)
  );
}

export function estimateTextTokens(text: string): number {
  let cjkCharacters = 0;
  let otherCharacters = 0;

  for (const character of text) {
    if (isCjkCharacter(character)) {
      cjkCharacters += 1;
    } else if (!/\s/.test(character)) {
      otherCharacters += 1;
    }
  }

  return cjkCharacters + Math.ceil(otherCharacters / 4);
}

export function estimateChatInputTokens(
  messages: Array<ChatMessageInput | ToolLoopMessage>,
  tools: ChatToolDefinition[] = [],
): number {
  const messageTokens = messages.reduce((total, message) => {
    const content =
      typeof message.content === 'string'
        ? message.content
        : message.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n');
    const toolCalls =
      'tool_calls' in message
        ? estimateTextTokens(JSON.stringify(message.tool_calls))
        : 0;

    return (
      total +
      estimateTextTokens(message.role) +
      estimateTextTokens(content) +
      toolCalls
    );
  }, 0);

  return messageTokens + estimateTextTokens(JSON.stringify(tools));
}

export function estimateEmbeddingInputTokens(input: string[]): number {
  return input.reduce((total, value) => total + estimateTextTokens(value), 0);
}

export class ModelCallObservation {
  private actualUsage?: ModelUsage;
  private completed = false;
  private readonly started = performance.now();
  private readonly startedAt = new Date();
  private outputText = '';

  constructor(
    private readonly observability: ObservabilityService,
    private readonly descriptor: ModelCallDescriptor,
  ) {}

  addOutput(content: string): void {
    this.outputText += content;
  }

  captureUsage(usage: ModelUsage | undefined): void {
    if (usage) {
      this.actualUsage = usage;
    }
  }

  async cancel(): Promise<void> {
    await this.finish('cancelled');
  }

  async complete(): Promise<void> {
    await this.finish('ok');
  }

  async fail(error: unknown): Promise<void> {
    await this.finish(
      'error',
      error instanceof Error ? error.message : '未知模型调用错误',
    );
  }

  private async finish(
    status: 'cancelled' | 'error' | 'ok',
    errorMessage?: string,
  ): Promise<void> {
    if (this.completed) {
      return;
    }

    this.completed = true;
    const inputTokens =
      this.actualUsage?.inputTokens ?? this.descriptor.estimatedInputTokens;
    const outputTokens =
      this.actualUsage?.outputTokens ?? estimateTextTokens(this.outputText);
    const hasEstimate = inputTokens > 0 || outputTokens > 0;
    const costUsdMicros = Math.round(
      inputTokens * (this.descriptor.inputCostPerMillionTokens ?? 0) +
        outputTokens * (this.descriptor.outputCostPerMillionTokens ?? 0),
    );

    await this.observability.record({
      category: 'model',
      costUsdMicros,
      durationMs: performance.now() - this.started,
      errorMessage,
      inputTokens,
      metadata: this.descriptor.metadata,
      model: this.descriptor.model,
      operation: this.descriptor.operation,
      outputTokens,
      providerId: this.descriptor.providerId,
      startedAt: this.startedAt,
      status,
      tokenCountSource: this.actualUsage
        ? 'actual'
        : hasEstimate
          ? 'estimated'
          : 'unavailable',
    });
  }
}

@Injectable()
export class ModelCallObserver {
  constructor(private readonly observability: ObservabilityService) {}

  start(descriptor: ModelCallDescriptor): ModelCallObservation {
    return new ModelCallObservation(this.observability, descriptor);
  }
}
