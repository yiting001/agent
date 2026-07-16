import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import type {
  EvaluationCase,
  EvaluationCaseResult,
  EvaluationMetric,
  EvaluationRunDetail,
} from '../domain/evaluation';
import {
  scoreContainsKeywords,
  weightedAverage,
} from '../domain/evaluation-scoring';
import { EvaluationAgentGateway } from './evaluation-agent.gateway';
import { EvaluationRepository } from './evaluation.repository';

@Injectable()
export class RunEvaluationSuiteUseCase {
  constructor(
    private readonly agents: EvaluationAgentGateway,
    private readonly repository: EvaluationRepository,
  ) {}

  async execute(suiteId: string): Promise<EvaluationRunDetail> {
    const suite = await this.repository.findSuiteById(suiteId);

    if (!suite) {
      throw new ApplicationError('not_found', '评估集不存在。');
    }

    if (suite.status !== 'ready') {
      throw new ApplicationError(
        'invalid_operation',
        '只有启用状态的评估集可以运行。',
      );
    }

    const metric = suite.metrics[0];

    if (!metric) {
      throw new ApplicationError('invalid_operation', '评估集缺少指标定义。');
    }

    const agent = await this.agents.get(suite.agentId);

    if (agent.status === 'disabled') {
      throw new ApplicationError(
        'invalid_operation',
        '已停用的智能体不能执行评估。',
      );
    }

    const runId = randomUUID();
    const startedAt = new Date();
    const results: EvaluationCaseResult[] = [];

    for (const [sequence, evaluationCase] of suite.cases.entries()) {
      results.push(
        await this.runCase({
          agentId: suite.agentId,
          evaluationCase,
          metric,
          runId,
          sequence,
        }),
      );
    }

    const score = weightedAverage(
      results.map((result) => ({
        score: result.score,
        weight: metric.weight,
      })),
    );
    const run = {
      agentId: suite.agentId,
      completedAt: new Date(),
      id: runId,
      score,
      startedAt,
      status: results.some((result) => result.status === 'failed')
        ? ('failed' as const)
        : ('completed' as const),
      suiteId,
      totalCases: suite.cases.length,
    };

    await this.repository.saveRun(run, results);

    return { ...run, results };
  }

  private async runCase(input: {
    agentId: string;
    evaluationCase: EvaluationCase;
    metric: EvaluationMetric;
    runId: string;
    sequence: number;
  }): Promise<EvaluationCaseResult> {
    try {
      const answer = await this.agents.run(
        input.agentId,
        input.evaluationCase.input,
      );
      const scored = scoreContainsKeywords(
        input.evaluationCase,
        answer,
        input.metric,
      );

      return {
        answer,
        caseId: input.evaluationCase.id,
        id: randomUUID(),
        input: input.evaluationCase.input,
        matchedKeywords: scored.matchedKeywords,
        missingKeywords: scored.missingKeywords,
        runId: input.runId,
        score: scored.score,
        sequence: input.sequence,
        status: scored.status,
      };
    } catch {
      return {
        answer: '',
        caseId: input.evaluationCase.id,
        errorMessage: '智能体调用失败，请检查模型、知识与技能配置。',
        id: randomUUID(),
        input: input.evaluationCase.input,
        matchedKeywords: [],
        missingKeywords: input.evaluationCase.expectedKeywords,
        runId: input.runId,
        score: 0,
        sequence: input.sequence,
        status: 'failed',
      };
    }
  }
}
