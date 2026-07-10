import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { KnowledgeCatalogService } from '../../knowledge/application/knowledge-catalog.service';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';

export interface AgentConfiguration {
  moduleIds: string[];
  providerId: string;
}

@Injectable()
export class AgentConfigurationService {
  constructor(
    private readonly knowledgeCatalog: KnowledgeCatalogService,
    private readonly modelProviders: ModelProviderRuntimeService,
  ) {}

  async resolve(
    providerId: string,
    moduleIds: string[],
  ): Promise<AgentConfiguration> {
    const provider = await this.modelProviders.get(providerId);

    if (!provider.chatModel) {
      throw new ApplicationError(
        'invalid_operation',
        '所选模型服务未配置对话模型。',
      );
    }

    const uniqueModuleIds = [...new Set(moduleIds)];

    await this.knowledgeCatalog.getModules(uniqueModuleIds);

    return {
      moduleIds: uniqueModuleIds,
      providerId: provider.id,
    };
  }
}
