import type {
  EvaluationCase,
  EvaluationCaseResultStatus,
  EvaluationMetric,
} from './evaluation';

export interface EvaluationScoreResult {
  matchedKeywords: string[];
  missingKeywords: string[];
  score: number;
  status: EvaluationCaseResultStatus;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function scoreContainsKeywords(
  evaluationCase: Pick<EvaluationCase, 'expectedKeywords'>,
  answer: string,
  metric: Pick<EvaluationMetric, 'passingThreshold'>,
): EvaluationScoreResult {
  const normalizedAnswer = normalize(answer);
  const keywords = [...new Set(evaluationCase.expectedKeywords.map(normalize))]
    .filter(Boolean)
    .sort();
  const matchedKeywords = keywords.filter((keyword) =>
    normalizedAnswer.includes(keyword),
  );
  const missingKeywords = keywords.filter(
    (keyword) => !matchedKeywords.includes(keyword),
  );
  const score =
    keywords.length === 0 ? 1 : matchedKeywords.length / keywords.length;

  return {
    matchedKeywords,
    missingKeywords,
    score,
    status: score >= metric.passingThreshold ? 'passed' : 'failed',
  };
}

export function weightedAverage(
  scores: Array<{ score: number; weight: number }>,
): number {
  const totalWeight = scores.reduce((total, item) => total + item.weight, 0);

  if (scores.length === 0 || totalWeight <= 0) {
    return 0;
  }

  return (
    scores.reduce((total, item) => total + item.score * item.weight, 0) /
    totalWeight
  );
}
