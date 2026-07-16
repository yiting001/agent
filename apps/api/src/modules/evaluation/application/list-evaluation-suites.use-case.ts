import { Injectable } from '@nestjs/common';

import type { EvaluationSuiteSummary } from '../domain/evaluation';
import { EvaluationRepository } from './evaluation.repository';

@Injectable()
export class ListEvaluationSuitesUseCase {
  constructor(private readonly repository: EvaluationRepository) {}

  execute(): Promise<EvaluationSuiteSummary[]> {
    return this.repository.listSuites();
  }
}
