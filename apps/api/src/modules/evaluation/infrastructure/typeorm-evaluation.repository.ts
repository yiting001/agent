import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { EvaluationRepository } from '../application/evaluation.repository';
import type {
  EvaluationCaseResult,
  EvaluationRun,
  EvaluationRunDetail,
  EvaluationRunSummary,
  EvaluationSuiteDetail,
  EvaluationSuiteSummary,
} from '../domain/evaluation';
import { EvaluationCaseEntity } from './evaluation-case.entity';
import { EvaluationCaseResultEntity } from './evaluation-case-result.entity';
import { EvaluationMetricEntity } from './evaluation-metric.entity';
import { EvaluationRunEntity } from './evaluation-run.entity';
import { EvaluationSuiteEntity } from './evaluation-suite.entity';

function runSummary(entity: EvaluationRunEntity): EvaluationRunSummary {
  return {
    completedAt: entity.completedAt?.toISOString(),
    errorMessage: entity.errorMessage,
    id: entity.id,
    score: entity.score,
    startedAt: entity.startedAt.toISOString(),
    status: entity.status,
    totalCases: entity.totalCases,
  };
}

function resultToDomain(
  entity: EvaluationCaseResultEntity,
): EvaluationCaseResult {
  return {
    answer: entity.answer,
    caseId: entity.caseId,
    errorMessage: entity.errorMessage,
    id: entity.id,
    input: entity.input,
    matchedKeywords: entity.matchedKeywords,
    missingKeywords: entity.missingKeywords,
    runId: entity.runId,
    score: entity.score,
    sequence: entity.sequence,
    status: entity.status,
  };
}

function runToDomain(
  entity: EvaluationRunEntity,
  results: EvaluationCaseResultEntity[],
): EvaluationRunDetail {
  return {
    agentId: entity.agentId,
    completedAt: entity.completedAt,
    errorMessage: entity.errorMessage,
    id: entity.id,
    results: results.map(resultToDomain),
    score: entity.score,
    startedAt: entity.startedAt,
    status: entity.status,
    suiteId: entity.suiteId,
    totalCases: entity.totalCases,
  };
}

@Injectable()
export class TypeOrmEvaluationRepository extends EvaluationRepository {
  constructor(
    @InjectRepository(EvaluationSuiteEntity)
    private readonly suites: Repository<EvaluationSuiteEntity>,
    @InjectRepository(EvaluationMetricEntity)
    private readonly metrics: Repository<EvaluationMetricEntity>,
    @InjectRepository(EvaluationCaseEntity)
    private readonly cases: Repository<EvaluationCaseEntity>,
    @InjectRepository(EvaluationRunEntity)
    private readonly runs: Repository<EvaluationRunEntity>,
    @InjectRepository(EvaluationCaseResultEntity)
    private readonly results: Repository<EvaluationCaseResultEntity>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async findRunById(id: string): Promise<EvaluationRunDetail | undefined> {
    const run = await this.runs.findOneBy({ id });

    if (!run) {
      return undefined;
    }

    const results = await this.results.find({
      order: { sequence: 'ASC' },
      where: { runId: id },
    });

    return runToDomain(run, results);
  }

  async findSuiteById(id: string): Promise<EvaluationSuiteDetail | undefined> {
    const [suite, metrics, cases] = await Promise.all([
      this.suites.findOneBy({ id }),
      this.metrics.find({ order: { id: 'ASC' }, where: { suiteId: id } }),
      this.cases.find({ order: { id: 'ASC' }, where: { suiteId: id } }),
    ]);

    return suite
      ? {
          agentId: suite.agentId,
          cases: cases.map((evaluationCase) => ({
            evaluationCriteria: evaluationCase.evaluationCriteria,
            expectedKeywords: evaluationCase.expectedKeywords,
            expectedOutput: evaluationCase.expectedOutput,
            id: evaluationCase.id,
            input: evaluationCase.input,
            source: evaluationCase.source,
            sourceFeedbackId: evaluationCase.sourceFeedbackId,
            sourceGenerationId: evaluationCase.sourceGenerationId,
            suiteId: evaluationCase.suiteId,
            tags: evaluationCase.tags,
          })),
          createdAt: suite.createdAt,
          description: suite.description,
          id: suite.id,
          metrics: metrics.map((metric) => ({
            id: metric.id,
            kind: metric.kind,
            name: metric.name,
            passingThreshold: metric.passingThreshold,
            weight: metric.weight,
          })),
          name: suite.name,
          status: suite.status,
          updatedAt: suite.updatedAt,
        }
      : undefined;
  }

  async listRuns(suiteId: string): Promise<EvaluationRunDetail[]> {
    const runs = await this.runs.find({
      order: { startedAt: 'DESC' },
      where: { suiteId },
    });
    const results =
      runs.length === 0
        ? []
        : await this.results.find({
            order: { sequence: 'ASC' },
            where: runs.map((run) => ({ runId: run.id })),
          });

    return runs.map((run) =>
      runToDomain(
        run,
        results.filter((result) => result.runId === run.id),
      ),
    );
  }

  async listSuites(): Promise<EvaluationSuiteSummary[]> {
    const [suites, cases, metrics, runs] = await Promise.all([
      this.suites.find({ order: { updatedAt: 'DESC' } }),
      this.cases.find(),
      this.metrics.find(),
      this.runs.find({ order: { startedAt: 'DESC' } }),
    ]);

    return suites.map((suite) => {
      const latestRun = runs.find((run) => run.suiteId === suite.id);

      return {
        agentId: suite.agentId,
        caseCount: cases.filter(
          (evaluationCase) => evaluationCase.suiteId === suite.id,
        ).length,
        createdAt: suite.createdAt.toISOString(),
        description: suite.description,
        id: suite.id,
        latestRun: latestRun ? runSummary(latestRun) : undefined,
        metricCount: metrics.filter((metric) => metric.suiteId === suite.id)
          .length,
        name: suite.name,
        status: suite.status,
        updatedAt: suite.updatedAt.toISOString(),
      };
    });
  }

  async saveRun(
    run: EvaluationRun,
    results: EvaluationCaseResult[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(EvaluationRunEntity).save(run);
      await manager.getRepository(EvaluationCaseResultEntity).save(results);
    });
  }

  async saveSuite(suite: EvaluationSuiteDetail): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(EvaluationSuiteEntity).save({
        agentId: suite.agentId,
        createdAt: suite.createdAt,
        description: suite.description,
        id: suite.id,
        name: suite.name,
        status: suite.status,
        updatedAt: suite.updatedAt,
      });
      await manager.getRepository(EvaluationMetricEntity).save(
        suite.metrics.map((metric) => ({
          ...metric,
          suiteId: suite.id,
        })),
      );
      await manager.getRepository(EvaluationCaseEntity).save(suite.cases);
    });
  }
}
