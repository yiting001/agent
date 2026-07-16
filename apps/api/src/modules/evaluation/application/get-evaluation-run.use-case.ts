import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import type { EvaluationRunDetail } from '../domain/evaluation';
import { EvaluationRepository } from './evaluation.repository';

@Injectable()
export class GetEvaluationRunUseCase {
  constructor(private readonly repository: EvaluationRepository) {}

  async execute(runId: string): Promise<EvaluationRunDetail> {
    const run = await this.repository.findRunById(runId);

    if (!run) {
      throw new ApplicationError('not_found', '评估运行不存在。');
    }

    return run;
  }
}
