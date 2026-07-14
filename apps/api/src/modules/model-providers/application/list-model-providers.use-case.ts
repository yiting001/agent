import { Injectable } from '@nestjs/common';

import type { ModelProviderSummary } from '../domain/model-provider';
import { ModelProviderRepository } from './model-provider.repository';

@Injectable()
export class ListModelProvidersUseCase {
  constructor(private readonly repository: ModelProviderRepository) {}

  async execute(): Promise<ModelProviderSummary[]> {
    const providers = await this.repository.list();

    return providers.map((provider) => ({
      baseUrl: provider.baseUrl,
      chatInputCostPerMillionTokens: provider.chatInputCostPerMillionTokens,
      chatModel: provider.chatModel,
      chatOutputCostPerMillionTokens: provider.chatOutputCostPerMillionTokens,
      configured: true,
      description: provider.description,
      embeddingDimensions: provider.embeddingDimensions,
      embeddingInputCostPerMillionTokens:
        provider.embeddingInputCostPerMillionTokens,
      embeddingModel: provider.embeddingModel,
      enabled: provider.enabled,
      id: provider.id,
      key: provider.key,
      name: provider.name,
      updatedAt: provider.updatedAt.toISOString(),
    }));
  }
}
