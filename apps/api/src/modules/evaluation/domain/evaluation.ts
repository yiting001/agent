/** 评估集创建后即可运行；当前版本暂不提供归档或草稿编辑入口。 */
export type EvaluationSuiteStatus = 'ready';

/** 当前支持的自动评分指标类型。 */
export type EvaluationMetricKind = 'contains_keywords';

/** 评估运行同步完成后只记录最终通过或失败状态。 */
export type EvaluationRunStatus = 'completed' | 'failed';

/** 单个用例执行结果。 */
export type EvaluationCaseResultStatus = 'failed' | 'passed';

/** 评估用例来源；线上反馈仅能经过人工审核后转换。 */
export type EvaluationCaseSource = 'feedback' | 'manual';

export interface EvaluationMetric {
  id: string;
  kind: EvaluationMetricKind;
  name: string;
  passingThreshold: number;
  weight: number;
}

export interface EvaluationCase {
  evaluationCriteria?: string;
  expectedKeywords: string[];
  expectedOutput?: string;
  id: string;
  input: string;
  source: EvaluationCaseSource;
  sourceFeedbackId?: string;
  sourceGenerationId?: string;
  suiteId: string;
  tags: string[];
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
