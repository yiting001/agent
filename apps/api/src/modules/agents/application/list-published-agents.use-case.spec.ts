import type { AgentSummary } from '../domain/agent';
import type { AgentRepository } from './agent.repository';
import { ListPublishedAgentsUseCase } from './list-published-agents.use-case';

function summary(overrides: Partial<AgentSummary>): AgentSummary {
  return {
    conversationCount: 0,
    description: '',
    id: 'agent-id',
    moduleIds: [],
    name: '智能体',
    providerId: 'provider-id',
    status: 'published',
    systemPrompt: '内部提示词',
    temperature: 0.7,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ListPublishedAgentsUseCase', () => {
  it('只返回已发布智能体，且只暴露展示必需字段', async () => {
    const repository = {
      list: () =>
        Promise.resolve([
          summary({ description: '答疑', id: 'a1', name: '助手A' }),
          summary({ id: 'a2', status: 'draft' }),
          summary({ id: 'a3', status: 'disabled' }),
        ]),
    } as AgentRepository;
    const useCase = new ListPublishedAgentsUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual([
      { description: '答疑', id: 'a1', name: '助手A' },
    ]);
  });
});
