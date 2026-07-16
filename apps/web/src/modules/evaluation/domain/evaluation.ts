export type EvaluationSuiteStatus = 'ready';
export type EvaluationRunStatus = 'completed' | 'failed';
export type EvaluationCaseResultStatus = 'failed' | 'passed';

export interface EvaluationSuiteSummary {
  agentId: string;
  caseCount: number;
  createdAt: string;
  description: string;
  id: string;
  latestRun?: EvaluationRunSummary;
  metricCount: number;
  name: string;
  status: EvaluationSuiteStatus;
  updatedAt: string;
}

export interface EvaluationRunSummary {
  completedAt?: string;
  errorMessage?: string;
  id: string;
  score: number;
  startedAt: string;
  status: EvaluationRunStatus;
  totalCases: number;
}

export interface EvaluationCaseResult {
  answer: string;
  caseId: string;
  errorMessage?: string;
  id: string;
  input: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  runId: string;
  score: number;
  sequence: number;
  status: EvaluationCaseResultStatus;
}

export interface EvaluationRunDetail extends EvaluationRunSummary {
  agentId: string;
  results: EvaluationCaseResult[];
  suiteId: string;
}

export interface CreateEvaluationSuiteInput {
  agentId: string;
  cases: Array<{
    expectedKeywords: string[];
    input: string;
  }>;
  description: string;
  metrics: Array<{
    name: string;
    passingThreshold: number;
    weight: number;
  }>;
  name: string;
}
