import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import {
  type ChatCompletionInput,
  type EmbeddingInput,
  ModelGateway,
} from '../application/model-gateway';

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

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.requestTimeoutMs = config.modelRequestTimeoutMs;
  }

  async chat(input: ChatCompletionInput): Promise<string> {
    const response = await this.request(`${input.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages: input.messages,
        model: input.model,
        temperature: input.temperature,
      }),
      headers: this.headers(input.apiKey),
      method: 'POST',
    });
    const body = await parseResponse(response);
    const content = readChatContent(body);

    if (!content) {
      throw new ApplicationError(
        'service_unavailable',
        '模型服务未返回有效对话内容。',
      );
    }

    return content;
  }

  async embed(input: EmbeddingInput): Promise<number[][]> {
    const response = await this.request(`${input.baseUrl}/embeddings`, {
      body: JSON.stringify({
        dimensions: input.dimensions,
        encoding_format: 'float',
        input: input.input,
        model: input.model,
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

    return embeddings;
  }

  async verify(baseUrl: string, apiKey: string): Promise<void> {
    const response = await this.request(`${baseUrl}/models`, {
      headers: this.headers(apiKey),
    });

    await parseResponse(response);
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
