import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import { ModelGateway } from '../../model-providers/application/model-gateway';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import type { KnowledgeBaseSummary } from '../domain/knowledge';
import { KnowledgeCatalogRepository } from './knowledge-catalog.repository';

export interface CreateKnowledgeBaseCommand {
  description: string;
  embeddingProviderId: string;
  name: string;
}

@Injectable()
export class CreateKnowledgeBaseUseCase {
  constructor(
    private readonly repository: KnowledgeCatalogRepository,
    private readonly modelProviders: ModelProviderRuntimeService,
    private readonly modelGateway: ModelGateway,
  ) {}

  async execute(
    command: CreateKnowledgeBaseCommand,
  ): Promise<KnowledgeBaseSummary> {
    const provider = await this.modelProviders.get(command.embeddingProviderId);

    if (!provider.embeddingModel || !provider.embeddingDimensions) {
      throw new ApplicationError(
        'invalid_operation',
        '所选模型服务未配置嵌入模型和向量维度。',
      );
    }

    const [probe] = await this.modelGateway.embed({
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      dimensions: provider.embeddingDimensions,
      inputCostPerMillionTokens: provider.embeddingInputCostPerMillionTokens,
      input: ['知识库创建校验'],
      model: provider.embeddingModel,
      operation: 'embedding.knowledge_base_probe',
      providerId: provider.id,
    });

    if (probe?.length !== provider.embeddingDimensions) {
      throw new ApplicationError(
        'invalid_operation',
        '嵌入模型返回维度与已保存配置不一致，请重新验证模型配置。',
      );
    }

    const now = new Date();
    const knowledgeBaseId = randomUUID();
    const moduleId = randomUUID();

    await this.repository.saveBase({
      createdAt: now,
      description: command.description,
      embeddingDimensions: provider.embeddingDimensions,
      embeddingModel: provider.embeddingModel,
      embeddingProviderId: provider.id,
      id: knowledgeBaseId,
      name: command.name,
      updatedAt: now,
    });
    await this.repository.saveModule({
      createdAt: now,
      description: '新上传文档默认归入此模块。',
      id: moduleId,
      knowledgeBaseId,
      name: '默认模块',
      updatedAt: now,
    });

    return {
      description: command.description,
      documentCount: 0,
      embeddingDimensions: provider.embeddingDimensions,
      embeddingModel: provider.embeddingModel,
      embeddingProviderId: provider.id,
      id: knowledgeBaseId,
      modules: [
        {
          description: '新上传文档默认归入此模块。',
          documentCount: 0,
          id: moduleId,
          knowledgeBaseId,
          name: '默认模块',
          sizeBytes: 0,
          status: 'empty',
          updatedAt: now.toISOString(),
        },
      ],
      name: command.name,
      sizeBytes: 0,
      status: 'empty',
      updatedAt: now.toISOString(),
    };
  }
}
