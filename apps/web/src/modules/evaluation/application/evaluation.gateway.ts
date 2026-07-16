import type {
  CreateEvaluationSuiteInput,
  EvaluationRunDetail,
  EvaluationSuiteSummary,
} from '../domain/evaluation';

export abstract class EvaluationGateway {
  abstract createSuite(
    input: CreateEvaluationSuiteInput,
  ): Promise<EvaluationSuiteSummary>;
  abstract getRun(runId: string): Promise<EvaluationRunDetail>;
  abstract listRuns(suiteId: string): Promise<EvaluationRunDetail[]>;
  abstract listSuites(): Promise<EvaluationSuiteSummary[]>;
  abstract runSuite(suiteId: string): Promise<EvaluationRunDetail>;
}
