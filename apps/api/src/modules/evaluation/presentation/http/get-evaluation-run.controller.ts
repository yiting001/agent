import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { GetEvaluationRunUseCase } from '../../application/get-evaluation-run.use-case';
import type { EvaluationRunDetail } from '../../domain/evaluation';

@ApiTags('evaluation')
@Controller('evaluation-runs')
export class GetEvaluationRunController {
  constructor(private readonly useCase: GetEvaluationRunUseCase) {}

  @Get(':runId')
  @ApiOperation({ summary: 'Get a single evaluation run with case results' })
  execute(@Param('runId') runId: string): Promise<EvaluationRunDetail> {
    return this.useCase.execute(runId);
  }
}
