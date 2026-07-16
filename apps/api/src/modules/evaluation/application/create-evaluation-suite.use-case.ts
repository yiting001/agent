import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import type { EvaluationSuiteSummary } from '../domain/evaluation';
import { EvaluationAgentGateway } from './evaluation-agent.gateway';
import { EvaluationRepository } from './evaluation.repository';

export interface CreateEvaluationSuiteCommand {
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

function normalizeKeywords(keywords: string[]): string[] {
  return [...new Set(keywords.map((keyword) => keyword.trim()))].filter(
    Boolean,
  );
}

@Injectable()
export class CreateEvaluationSuiteUseCase {
  constructor(
    private readonly agents: EvaluationAgentGateway,
    private readonly repository: EvaluationRepository,
  ) {}

  async execute(
    command: CreateEvaluationSuiteCommand,
  ): Promise<EvaluationSuiteSummary> {
    const agent = await this.agents.get(command.agentId);

    if (agent.status === 'disabled') {
      throw new ApplicationError(
        'invalid_operation',
        '已停用的智能体不能创建评估集。',
      );
    }

    if (command.cases.length === 0) {
      throw new ApplicationError(
        'invalid_operation',
        '评估集至少需要一个用例。',
      );
    }

    if (command.metrics.length !== 1) {
      throw new ApplicationError(
        'invalid_operation',
        '当前版本仅支持一个关键词命中率指标。',
      );
    }

    const now = new Date();
    const suiteId = randomUUID();
    const suite = {
      agentId: command.agentId,
      cases: command.cases.map((evaluationCase) => {
        const expectedKeywords = normalizeKeywords(
          evaluationCase.expectedKeywords,
        );

        if (expectedKeywords.length === 0) {
          throw new ApplicationError(
            'invalid_operation',
            '每个评估用例至少需要一个期望关键词。',
          );
        }

        return {
          expectedKeywords,
          id: randomUUID(),
          input: evaluationCase.input.trim(),
          suiteId,
        };
      }),
      createdAt: now,
      description: command.description.trim(),
      id: suiteId,
      metrics: command.metrics.map((metric) => ({
        id: randomUUID(),
        kind: 'contains_keywords' as const,
        name: metric.name.trim(),
        passingThreshold: metric.passingThreshold,
        weight: metric.weight,
      })),
      name: command.name.trim(),
      status: 'ready' as const,
      updatedAt: now,
    };

    await this.repository.saveSuite(suite);

    return {
      agentId: suite.agentId,
      caseCount: suite.cases.length,
      createdAt: suite.createdAt.toISOString(),
      description: suite.description,
      id: suite.id,
      metricCount: suite.metrics.length,
      name: suite.name,
      status: suite.status,
      updatedAt: suite.updatedAt.toISOString(),
    };
  }
}
