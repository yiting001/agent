import type {
  EvaluationCaseResult,
  EvaluationRun,
  EvaluationRunDetail,
  EvaluationSuiteDetail,
  EvaluationSuiteSummary,
} from '../domain/evaluation';

export abstract class EvaluationRepository {
  abstract findSuiteById(
    id: string,
  ): Promise<EvaluationSuiteDetail | undefined>;
  abstract findRunById(id: string): Promise<EvaluationRunDetail | undefined>;
  abstract listSuites(): Promise<EvaluationSuiteSummary[]>;
  abstract listRuns(suiteId: string): Promise<EvaluationRunDetail[]>;
  abstract saveSuite(suite: EvaluationSuiteDetail): Promise<void>;
  abstract saveRun(
    run: EvaluationRun,
    results: EvaluationCaseResult[],
  ): Promise<void>;
}
