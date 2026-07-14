import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import {
  type ChatCompletionInput,
  type ChatToolCall,
  type EmbeddingInput,
  ModelGateway,
  type ToolChatInput,
  type ToolChatResult,
} from '../application/model-gateway';
import {
  estimateChatInputTokens,
  estimateEmbeddingInputTokens,
  ModelCallObserver,
  type ModelUsage,
} from './model-call-observer';

interface JsonRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function readChatContent(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    return undefined;
  }

  const choices: unknown[] = value.choices;
  const firstChoice = choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return undefined;
  }

  return typeof firstChoice.message.content === 'string'
    ? firstChoice.message.content
    : undefined;
}

function readChatDelta(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    return undefined;
  }

  const firstChoice: unknown = value.choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.delta)) {
    return undefined;
  }

  return typeof firstChoice.delta.content === 'string'
    ? firstChoice.delta.content
    : undefined;
}

function readToolCalls(value: unknown): ChatToolCall[] {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    return [];
  }

  const firstChoice: unknown = value.choices[0];

  if (
    !isRecord(firstChoice) ||
    !isRecord(firstChoice.message) ||
    !Array.isArray(firstChoice.message.tool_calls)
  ) {
    return [];
  }

  const toolCalls: ChatToolCall[] = [];

  for (const item of firstChoice.message.tool_calls) {
    if (
      isRecord(item) &&
      typeof item.id === 'string' &&
      isRecord(item.function) &&
      typeof item.function.name === 'string' &&
      typeof item.function.arguments === 'string'
    ) {
      toolCalls.push({
        arguments: item.function.arguments,
        id: item.id,
        name: item.function.name,
      });
    }
  }

  return toolCalls;
}

function readEmbeddings(value: unknown): number[][] | undefined {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    return undefined;
  }

  const embeddings: number[][] = [];

  for (const item of value.data) {
    if (!isRecord(item) || !Array.isArray(item.embedding)) {
      return undefined;
    }

    const embedding = item.embedding.filter(
      (coordinate): coordinate is number => typeof coordinate === 'number',
    );

    if (embedding.length !== item.embedding.length) {
      return undefined;
    }

    embeddings.push(embedding);
  }

  return embeddings;
}

function readUsage(value: unknown): ModelUsage | undefined {
  if (!isRecord(value) || !isRecord(value.usage)) {
    return undefined;
  }

  const inputTokens =
    typeof value.usage.prompt_tokens === 'number'
      ? value.usage.prompt_tokens
      : value.usage.input_tokens;
  const outputTokens =
    typeof value.usage.completion_tokens === 'number'
      ? value.usage.completion_tokens
      : typeof value.usage.output_tokens === 'number'
        ? value.usage.output_tokens
        : 0;

  if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
    return undefined;
  }

  return { inputTokens, outputTokens };
}

async function parseResponse(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      isRecord(body) &&
      isRecord(body.error) &&
      typeof body.error.message === 'string'
        ? body.error.message
        : `模型服务返回 ${response.status}。`;

    throw new ApplicationError('service_unavailable', message);
  }

  return body;
}

@Injectable()
export class OpenAiCompatibleGateway extends ModelGateway {
  private readonly requestTimeoutMs: number;

  constructor(
    configService: ConfigService,
    private readonly modelCalls: ModelCallObserver,
  ) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.requestTimeoutMs = config.modelRequestTimeoutMs;
  }

  async chat(input: ChatCompletionInput): Promise<string> {
    let content = '';

    for await (const delta of this.streamChat(input)) {
      content += delta;
    }

    if (!content.trim()) {
      throw new ApplicationError(
        'service_unavailable',
        '模型服务未返回有效对话内容。',
      );
    }

    return content;
  }

  async *streamChat(input: ChatCompletionInput): AsyncIterable<string> {
    const observation = this.modelCalls.start({
      estimatedInputTokens: estimateChatInputTokens(input.messages),
      inputCostPerMillionTokens: input.inputCostPerMillionTokens,
      model: input.model,
      operation: input.operation ?? 'chat.stream',
      outputCostPerMillionTokens: input.outputCostPerMillionTokens,
      providerId: input.providerId,
    });
    let outcome: 'active' | 'completed' | 'failed' = 'active';

    try {
      const response = await this.request(`${input.baseUrl}/chat/completions`, {
        body: JSON.stringify({
          messages: input.messages,
          model: input.model,
          stream: true,
          stream_options: { include_usage: true },
          temperature: input.temperature,
        }),
        headers: this.headers(input.apiKey),
        method: 'POST',
      });

      if (!response.ok) {
        await parseResponse(response);
        return;
      }

      if (response.headers.get('content-type')?.includes('application/json')) {
        const body: unknown = await response.json();
        const content = readChatContent(body);

        observation.captureUsage(readUsage(body));

        if (content) {
          observation.addOutput(content);
          yield content;
        }

        outcome = 'completed';
        return;
      }

      if (!response.body) {
        throw new ApplicationError(
          'service_unavailable',
          '模型服务未返回可读取的流。',
        );
      }

      const decoder = new TextDecoder();
      let buffer = '';

      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split(/\r?\n/);

        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const data = line.startsWith('data:') ? line.slice(5).trim() : '';

          if (!data || data === '[DONE]') {
            continue;
          }

          const payload: unknown = JSON.parse(data);
          const delta = readChatDelta(payload);

          observation.captureUsage(readUsage(payload));

          if (delta) {
            observation.addOutput(delta);
            yield delta;
          }
        }
      }

      outcome = 'completed';
    } catch (error) {
      outcome = 'failed';
      await observation.fail(error);
      throw error;
    } finally {
      if (outcome === 'completed') {
        await observation.complete();
      } else if (outcome === 'active') {
        await observation.cancel();
      }
    }
  }

  async chatWithTools(input: ToolChatInput): Promise<ToolChatResult> {
    const observation = this.modelCalls.start({
      estimatedInputTokens: estimateChatInputTokens(
        input.messages,
        input.tools,
      ),
      inputCostPerMillionTokens: input.inputCostPerMillionTokens,
      model: input.model,
      operation: input.operation ?? 'chat.tools',
      outputCostPerMillionTokens: input.outputCostPerMillionTokens,
      providerId: input.providerId,
    });

    try {
      const response = await this.request(`${input.baseUrl}/chat/completions`, {
        body: JSON.stringify({
          messages: input.messages,
          model: input.model,
          temperature: input.temperature,
          tools: input.tools,
        }),
        headers: this.headers(input.apiKey),
        method: 'POST',
      });
      const body = await parseResponse(response);
      const content = readChatContent(body) ?? '';

      observation.addOutput(content);
      observation.captureUsage(readUsage(body));
      await observation.complete();

      return {
        content,
        toolCalls: readToolCalls(body),
      };
    } catch (error) {
      await observation.fail(error);
      throw error;
    }
  }

  async embed(input: EmbeddingInput): Promise<number[][]> {
    const observation = this.modelCalls.start({
      estimatedInputTokens: estimateEmbeddingInputTokens(input.input),
      inputCostPerMillionTokens: input.inputCostPerMillionTokens,
      model: input.model,
      operation: input.operation ?? 'embedding.generate',
      providerId: input.providerId,
    });

    try {
      const response = await this.request(`${input.baseUrl}/embeddings`, {
        body: JSON.stringify({
          encoding_format: 'float',
          input: input.input,
          model: input.model,
          ...(input.dimensions ? { dimensions: input.dimensions } : {}),
        }),
        headers: this.headers(input.apiKey),
        method: 'POST',
      });
      const body = await parseResponse(response);
      const embeddings = readEmbeddings(body);

      if (!embeddings || embeddings.length !== input.input.length) {
        throw new ApplicationError(
          'service_unavailable',
          '模型服务未返回完整向量。',
        );
      }

      observation.captureUsage(readUsage(body));
      await observation.complete();

      return embeddings;
    } catch (error) {
      await observation.fail(error);
      throw error;
    }
  }

  async verify(baseUrl: string, apiKey: string): Promise<void> {
    const observation = this.modelCalls.start({
      estimatedInputTokens: 0,
      model: 'model-catalog',
      operation: 'model.verify',
    });

    try {
      const response = await this.request(`${baseUrl}/models`, {
        headers: this.headers(apiKey),
      });

      await parseResponse(response);
      await observation.complete();
    } catch (error) {
      await observation.fail(error);
      throw error;
    }
  }

  private headers(apiKey: string): Record<string, string> {
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async request(url: string, options: RequestInit): Promise<Response> {
    try {
      return await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : '网络连接失败';

      throw new ApplicationError(
        'service_unavailable',
        `无法连接模型服务：${detail}`,
      );
    }
  }
}
