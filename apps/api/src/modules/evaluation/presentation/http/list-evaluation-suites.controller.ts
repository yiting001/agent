import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ListEvaluationSuitesUseCase } from '../../application/list-evaluation-suites.use-case';
import type { EvaluationSuiteSummary } from '../../domain/evaluation';

@ApiTags('evaluation')
@Controller('evaluation-suites')
export class ListEvaluationSuitesController {
  constructor(private readonly useCase: ListEvaluationSuitesUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List agent evaluation suites' })
  execute(): Promise<EvaluationSuiteSummary[]> {
    return this.useCase.execute();
  }
}
