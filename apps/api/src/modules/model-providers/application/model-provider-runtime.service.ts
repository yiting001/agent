import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { RuntimeModelProvider } from '../domain/model-provider';
import { CredentialCipher } from './credential-cipher';
import { ModelProviderRepository } from './model-provider.repository';

@Injectable()
export class ModelProviderRuntimeService {
  constructor(
    private readonly repository: ModelProviderRepository,
    private readonly cipher: CredentialCipher,
  ) {}

  async get(providerId: string): Promise<RuntimeModelProvider> {
    const provider = await this.repository.findById(providerId);

    if (!provider || !provider.enabled) {
      throw new ApplicationError('not_found', '模型服务不存在或未启用。');
    }

    return {
      apiKey: this.cipher.decrypt(provider.credential),
      baseUrl: provider.baseUrl,
      chatInputCostPerMillionTokens: provider.chatInputCostPerMillionTokens,
      chatModel: provider.chatModel,
      chatOutputCostPerMillionTokens: provider.chatOutputCostPerMillionTokens,
      embeddingDimensions: provider.embeddingDimensions,
      embeddingInputCostPerMillionTokens:
        provider.embeddingInputCostPerMillionTokens,
      embeddingModel: provider.embeddingModel,
      id: provider.id,
    };
  }
}
