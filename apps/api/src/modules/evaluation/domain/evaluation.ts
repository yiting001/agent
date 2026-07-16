/** 评估集创建后即可运行；当前版本暂不提供归档或草稿编辑入口。 */
export type EvaluationSuiteStatus = 'ready';

/** 当前支持的自动评分指标类型。 */
export type EvaluationMetricKind = 'contains_keywords';

/** 评估运行同步完成后只记录最终通过或失败状态。 */
export type EvaluationRunStatus = 'completed' | 'failed';

/** 单个用例执行结果。 */
export type EvaluationCaseResultStatus = 'failed' | 'passed';

export interface EvaluationMetric {
  id: string;
  kind: EvaluationMetricKind;
  name: string;
  passingThreshold: number;
  weight: number;
}

export interface EvaluationCase {
  id: string;
  expectedKeywords: string[];
  input: string;
  suiteId: string;
}

export interface EvaluationSuite {
  agentId: string;
  createdAt: Date;
  description: string;
  id: string;
  name: string;
  status: EvaluationSuiteStatus;
  updatedAt: Date;
}

export interface EvaluationSuiteDetail extends EvaluationSuite {
  cases: EvaluationCase[];
  metrics: EvaluationMetric[];
}

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

export interface EvaluationRun {
  agentId: string;
  completedAt?: Date;
  errorMessage?: string;
  id: string;
  score: number;
  startedAt: Date;
  status: EvaluationRunStatus;
  suiteId: string;
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

export interface EvaluationRunDetail extends EvaluationRun {
  results: EvaluationCaseResult[];
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
