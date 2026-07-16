import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateEvaluationSuiteUseCase } from '../../application/create-evaluation-suite.use-case';
import type { EvaluationSuiteSummary } from '../../domain/evaluation';
import { CreateEvaluationSuiteDto } from './create-evaluation-suite.dto';

@ApiTags('evaluation')
@Controller('evaluation-suites')
export class CreateEvaluationSuiteController {
  constructor(private readonly useCase: CreateEvaluationSuiteUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Create an agent evaluation suite' })
  execute(
    @Body() body: CreateEvaluationSuiteDto,
  ): Promise<EvaluationSuiteSummary> {
    return this.useCase.execute(body);
  }
}
