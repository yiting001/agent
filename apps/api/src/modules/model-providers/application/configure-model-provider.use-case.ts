import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { ModelProviderSummary } from '../domain/model-provider';
import { ApplicationError } from '../../../shared/application/application-error';
import { CredentialCipher } from './credential-cipher';
import { ModelGateway } from './model-gateway';
import { ModelProviderRepository } from './model-provider.repository';

export interface ConfigureModelProviderCommand {
  apiKey: string;
  baseUrl: string;
  chatModel?: string;
  description: string;
  embeddingDimensions?: number;
  embeddingModel?: string;
  key: string;
  name: string;
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

@Injectable()
export class ConfigureModelProviderUseCase {
  constructor(
    private readonly repository: ModelProviderRepository,
    private readonly cipher: CredentialCipher,
    private readonly gateway: ModelGateway,
  ) {}

  async execute(
    command: ConfigureModelProviderCommand,
  ): Promise<ModelProviderSummary> {
    const baseUrl = normalizeBaseUrl(command.baseUrl);

    await this.gateway.verify(baseUrl, command.apiKey);
    const embeddingDimensions = command.embeddingModel
      ? await this.detectEmbeddingDimensions({
          apiKey: command.apiKey,
          baseUrl,
          dimensions: command.embeddingDimensions,
          model: command.embeddingModel,
        })
      : undefined;

    const existing = await this.repository.findByKey(command.key);
    const now = new Date();
    const provider = {
      baseUrl,
      chatModel: command.chatModel,
      createdAt: existing?.createdAt ?? now,
      credential: this.cipher.encrypt(command.apiKey),
      description: command.description,
      embeddingDimensions,
      embeddingModel: command.embeddingModel,
      enabled: true,
      id: existing?.id ?? randomUUID(),
      key: command.key,
      name: command.name,
      updatedAt: now,
    };

    await this.repository.save(provider);

    return {
      baseUrl: provider.baseUrl,
      chatModel: provider.chatModel,
      configured: true,
      description: provider.description,
      embeddingDimensions: provider.embeddingDimensions,
      embeddingModel: provider.embeddingModel,
      enabled: provider.enabled,
      id: provider.id,
      key: provider.key,
      name: provider.name,
      updatedAt: provider.updatedAt.toISOString(),
    };
  }

  private async detectEmbeddingDimensions(input: {
    apiKey: string;
    baseUrl: string;
    dimensions?: number;
    model: string;
  }): Promise<number> {
    const [embedding] = await this.gateway.embed({
      ...input,
      input: ['知识库嵌入模型连接测试'],
    });

    if (!embedding?.length) {
      throw new ApplicationError(
        'service_unavailable',
        '嵌入模型未返回有效向量，请检查模型名称和服务地址。',
      );
    }

    return embedding.length;
  }
}
