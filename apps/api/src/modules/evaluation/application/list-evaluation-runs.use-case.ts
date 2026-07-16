import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { EvaluationRunDetail } from '../domain/evaluation';
import { EvaluationRepository } from './evaluation.repository';

@Injectable()
export class ListEvaluationRunsUseCase {
  constructor(private readonly repository: EvaluationRepository) {}

  async execute(suiteId: string): Promise<EvaluationRunDetail[]> {
    const suite = await this.repository.findSuiteById(suiteId);

    if (!suite) {
      throw new ApplicationError('not_found', '评估集不存在。');
    }

    return this.repository.listRuns(suiteId);
  }
}
