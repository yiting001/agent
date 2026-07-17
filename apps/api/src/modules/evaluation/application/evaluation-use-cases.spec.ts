import type {
  EvaluationCaseResult,
  EvaluationRun,
  EvaluationRunDetail,
  EvaluationSuiteDetail,
  EvaluationSuiteSummary,
} from '../domain/evaluation';
import {
  type CreateEvaluationSuiteCommand,
  CreateEvaluationSuiteUseCase,
} from './create-evaluation-suite.use-case';
import {
  EvaluationAgentGateway,
  type EvaluationAgentReference,
} from './evaluation-agent.gateway';
import { EvaluationRepository } from './evaluation.repository';
import { RunEvaluationSuiteUseCase } from './run-evaluation-suite.use-case';

class FakeAgentGateway extends EvaluationAgentGateway {
  answer = '退款可转人工客服。';
  failure = false;
  status: EvaluationAgentReference['status'] = 'published';

  get(): Promise<EvaluationAgentReference> {
    return Promise.resolve({ status: this.status });
  }

  run(): Promise<string> {
    return this.failure
      ? Promise.reject(new Error('upstream secret'))
      : Promise.resolve(this.answer);
  }
}

class InMemoryEvaluationRepository extends EvaluationRepository {
  run?: EvaluationRunDetail;
  suite?: EvaluationSuiteDetail;

  findRunById(id: string): Promise<EvaluationRunDetail | undefined> {
    return Promise.resolve(this.run?.id === id ? this.run : undefined);
  }

  findSuiteById(id: string): Promise<EvaluationSuiteDetail | undefined> {
    return Promise.resolve(this.suite?.id === id ? this.suite : undefined);
  }

  listRuns(): Promise<EvaluationRunDetail[]> {
    return Promise.resolve(this.run ? [this.run] : []);
  }

  listSuites(): Promise<EvaluationSuiteSummary[]> {
    return Promise.resolve([]);
  }

  saveRun(run: EvaluationRun, results: EvaluationCaseResult[]): Promise<void> {
    this.run = { ...run, results };

    return Promise.resolve();
  }

  saveSuite(suite: EvaluationSuiteDetail): Promise<void> {
    this.suite = suite;

    return Promise.resolve();
  }
}

function createCommand(): CreateEvaluationSuiteCommand {
  return {
    agentId: 'agent-id',
    cases: [
      {
        expectedKeywords: ['退款', ' 退款 ', '人工客服'],
        input: '如何申请退款？',
      },
    ],
    description: '退款回答基准',
    metrics: [
      {
        name: '关键词命中率',
        passingThreshold: 1,
        weight: 1,
      },
    ],
    name: '退款评估',
  };
}

describe('evaluation application use cases', () => {
  it('creates a ready suite with normalized keywords', async () => {
    const agents = new FakeAgentGateway();
    const repository = new InMemoryEvaluationRepository();
    const useCase = new CreateEvaluationSuiteUseCase(agents, repository);

    const suite = await useCase.execute(createCommand());

    expect(suite.status).toBe('ready');
    expect(repository.suite?.cases[0]).toMatchObject({
      expectedKeywords: ['退款', '人工客服'],
      source: 'manual',
      tags: [],
    });
  });

  it('rejects disabled agents', async () => {
    const agents = new FakeAgentGateway();
    const repository = new InMemoryEvaluationRepository();
    const useCase = new CreateEvaluationSuiteUseCase(agents, repository);

    agents.status = 'disabled';

    await expect(useCase.execute(createCommand())).rejects.toThrow(
      '已停用的智能体不能创建评估集。',
    );
  });

  it('runs the agent and stores scored results', async () => {
    const agents = new FakeAgentGateway();
    const repository = new InMemoryEvaluationRepository();
    const creator = new CreateEvaluationSuiteUseCase(agents, repository);

    await creator.execute(createCommand());

    const result = await new RunEvaluationSuiteUseCase(
      agents,
      repository,
    ).execute(repository.suite?.id ?? '');

    expect(result.score).toBe(1);
    expect(result.status).toBe('completed');
    expect(result.results[0]).toMatchObject({
      input: '如何申请退款？',
      sequence: 0,
      status: 'passed',
    });
  });

  it('stores a sanitized failure without leaking upstream details', async () => {
    const agents = new FakeAgentGateway();
    const repository = new InMemoryEvaluationRepository();
    const creator = new CreateEvaluationSuiteUseCase(agents, repository);

    await creator.execute(createCommand());
    agents.failure = true;

    const result = await new RunEvaluationSuiteUseCase(
      agents,
      repository,
    ).execute(repository.suite?.id ?? '');

    expect(result.status).toBe('failed');
    expect(result.results[0]?.errorMessage).toBe(
      '智能体调用失败，请检查模型、知识与技能配置。',
    );
    expect(JSON.stringify(result)).not.toContain('upstream secret');
  });
});
