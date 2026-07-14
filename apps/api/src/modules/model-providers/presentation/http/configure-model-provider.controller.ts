import { Body, Controller, Param, Put } from '@nestjs/common';

import type { ModelProviderSummary } from '../../domain/model-provider';
import { ConfigureModelProviderUseCase } from '../../application/configure-model-provider.use-case';
import { ConfigureModelProviderDto } from './configure-model-provider.dto';

@Controller('model-providers')
export class ConfigureModelProviderController {
  constructor(private readonly useCase: ConfigureModelProviderUseCase) {}

  @Put(':key')
  execute(
    @Param('key') key: string,
    @Body() body: ConfigureModelProviderDto,
  ): Promise<ModelProviderSummary> {
    return this.useCase.execute({
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      chatInputCostPerMillionTokens: body.chatInputCostPerMillionTokens,
      chatModel: body.chatModel,
      chatOutputCostPerMillionTokens: body.chatOutputCostPerMillionTokens,
      description: body.description,
      embeddingDimensions: body.embeddingDimensions,
      embeddingInputCostPerMillionTokens:
        body.embeddingInputCostPerMillionTokens,
      embeddingModel: body.embeddingModel,
      key,
      name: body.name,
    });
  }
}
