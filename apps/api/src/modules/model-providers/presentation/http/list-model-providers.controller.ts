import { Controller, Get } from '@nestjs/common';

import type { ModelProviderSummary } from '../../domain/model-provider';
import { ListModelProvidersUseCase } from '../../application/list-model-providers.use-case';

@Controller('model-providers')
export class ListModelProvidersController {
  constructor(private readonly useCase: ListModelProvidersUseCase) {}

  @Get()
  execute(): Promise<ModelProviderSummary[]> {
    return this.useCase.execute();
  }
}
