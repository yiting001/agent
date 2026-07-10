import { Controller, Get } from '@nestjs/common';

import type { ApiApplicationSummary } from '../../domain/api-application';
import { ListApiApplicationsUseCase } from '../../application/list-api-applications.use-case';

@Controller('api-applications')
export class ListApiApplicationsController {
  constructor(private readonly useCase: ListApiApplicationsUseCase) {}

  @Get()
  execute(): Promise<ApiApplicationSummary[]> {
    return this.useCase.execute();
  }
}
