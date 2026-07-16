import { Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RunEvaluationSuiteUseCase } from '../../application/run-evaluation-suite.use-case';
import type { EvaluationRunDetail } from '../../domain/evaluation';

@ApiTags('evaluation')
@Controller('evaluation-suites/:suiteId/runs')
export class RunEvaluationSuiteController {
  constructor(private readonly useCase: RunEvaluationSuiteUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Run an agent evaluation suite' })
  execute(@Param('suiteId') suiteId: string): Promise<EvaluationRunDetail> {
    return this.useCase.execute(suiteId);
  }
}
