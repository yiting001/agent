import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireManagementScopes } from '../../../management-access/presentation/http/management-access.decorators';
import { ListEvaluationRunsUseCase } from '../../application/list-evaluation-runs.use-case';
import type { EvaluationRunDetail } from '../../domain/evaluation';

@ApiTags('evaluation')
@Controller('evaluation-suites/:suiteId/runs')
export class ListEvaluationRunsController {
  constructor(private readonly useCase: ListEvaluationRunsUseCase) {}

  @Get()
  @RequireManagementScopes('evaluation:manage')
  @ApiOperation({ summary: 'List runs for an evaluation suite' })
  execute(@Param('suiteId') suiteId: string): Promise<EvaluationRunDetail[]> {
    return this.useCase.execute(suiteId);
  }
}
