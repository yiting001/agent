import { Body, Controller, Post } from '@nestjs/common';

import type { ApiApplicationSummary } from '../../domain/api-application';
import { CreateApiApplicationUseCase } from '../../application/create-api-application.use-case';
import { CreateApiApplicationDto } from './create-api-application.dto';

@Controller('api-applications')
export class CreateApiApplicationController {
  constructor(private readonly useCase: CreateApiApplicationUseCase) {}

  @Post()
  execute(
    @Body() body: CreateApiApplicationDto,
  ): Promise<ApiApplicationSummary> {
    return this.useCase.execute(body);
  }
}
