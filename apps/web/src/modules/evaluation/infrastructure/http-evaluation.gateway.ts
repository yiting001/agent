import type { HttpClient } from '@/shared/http/http-client';

import { EvaluationGateway } from '../application/evaluation.gateway';
import type {
  CreateEvaluationSuiteInput,
  EvaluationRunDetail,
  EvaluationSuiteSummary,
} from '../domain/evaluation';

export class HttpEvaluationGateway extends EvaluationGateway {
  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  createSuite(
    input: CreateEvaluationSuiteInput,
  ): Promise<EvaluationSuiteSummary> {
    return this.httpClient.post<
      EvaluationSuiteSummary,
      CreateEvaluationSuiteInput
    >('/evaluation-suites', input);
  }

  getRun(runId: string): Promise<EvaluationRunDetail> {
    return this.httpClient.get<EvaluationRunDetail>(
      `/evaluation-runs/${runId}`,
    );
  }

  listRuns(suiteId: string): Promise<EvaluationRunDetail[]> {
    return this.httpClient.get<EvaluationRunDetail[]>(
      `/evaluation-suites/${suiteId}/runs`,
    );
  }

  listSuites(): Promise<EvaluationSuiteSummary[]> {
    return this.httpClient.get<EvaluationSuiteSummary[]>('/evaluation-suites');
  }

  runSuite(suiteId: string): Promise<EvaluationRunDetail> {
    return this.httpClient.post<EvaluationRunDetail, Record<string, never>>(
      `/evaluation-suites/${suiteId}/runs`,
      {},
    );
  }
}
