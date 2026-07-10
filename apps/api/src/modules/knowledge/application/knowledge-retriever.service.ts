import { Injectable } from '@nestjs/common';

import { ModelGateway } from '../../model-providers/application/model-gateway';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import type { KnowledgeSearchResult } from './vector-index';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { VectorIndex } from './vector-index';

const RESULTS_PER_BASE = 4;
const MAX_RESULTS = 8;

@Injectable()
export class KnowledgeRetrieverService {
  constructor(
    private readonly catalog: KnowledgeCatalogService,
    private readonly modelProviders: ModelProviderRuntimeService,
    private readonly modelGateway: ModelGateway,
    private readonly vectorIndex: VectorIndex,
  ) {}

  async retrieve(
    moduleIds: string[],
    query: string,
  ): Promise<KnowledgeSearchResult[]> {
    const modules = await this.catalog.getModules(moduleIds);
    const modulesByBase = new Map<string, string[]>();

    for (const module of modules) {
      const current = modulesByBase.get(module.knowledgeBaseId) ?? [];

      current.push(module.id);
      modulesByBase.set(module.knowledgeBaseId, current);
    }

    const resultGroups = await Promise.all(
      [...modulesByBase.entries()].map(
        async ([knowledgeBaseId, selectedModuleIds]) => {
          const knowledgeBase = await this.catalog.getBase(knowledgeBaseId);
          const provider = await this.modelProviders.get(
            knowledgeBase.embeddingProviderId,
          );

          if (!provider.embeddingModel || !provider.embeddingDimensions) {
            return [];
          }

          const embeddings = await this.modelGateway.embed({
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl,
            dimensions: knowledgeBase.embeddingDimensions,
            input: [query],
            model: knowledgeBase.embeddingModel,
          });
          const vector = embeddings[0];

          if (!vector) {
            return [];
          }

          return this.vectorIndex.search(
            knowledgeBase,
            selectedModuleIds,
            vector,
            RESULTS_PER_BASE,
          );
        },
      ),
    );

    return resultGroups
      .flat()
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_RESULTS);
  }
}
