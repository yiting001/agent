import type { PromptPolicy } from '../domain/prompt-policy';
import { ListPromptPoliciesUseCase } from './list-prompt-policies.use-case';
import { PromptPolicyRepository } from './prompt-policy.repository';
import { PromptPolicyRuntimeService } from './prompt-policy-runtime.service';
import { UpdatePromptPolicyUseCase } from './update-prompt-policy.use-case';

function promptPolicy(overrides: Partial<PromptPolicy> = {}): PromptPolicy {
  return {
    category: 'output',
    content: '输出安全 HTML。',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    description: '富内容输出约束',
    enabled: true,
    id: '7ce8c761-0f05-4cf6-9e20-45e965243f36',
    key: 'rich-content-output',
    name: '富内容 HTML 输出',
    priority: 100,
    revision: 1,
    source: 'builtin',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

class MemoryPromptPolicyRepository extends PromptPolicyRepository {
  private readonly policies = new Map<string, PromptPolicy>();

  constructor(initial: PromptPolicy[]) {
    super();

    for (const policy of initial) {
      this.policies.set(policy.id, policy);
    }
  }

  findById(id: string): Promise<PromptPolicy | undefined> {
    return Promise.resolve(this.policies.get(id));
  }

  list(): Promise<PromptPolicy[]> {
    return Promise.resolve([...this.policies.values()]);
  }

  update(policy: PromptPolicy, expectedRevision: number): Promise<boolean> {
    const current = this.policies.get(policy.id);

    if (!current || current.revision !== expectedRevision) {
      return Promise.resolve(false);
    }

    this.policies.set(policy.id, policy);
    return Promise.resolve(true);
  }
}

describe('Prompt policy use cases', () => {
  it('lists serialized built-in policies and filters disabled runtime entries', async () => {
    const repository = new MemoryPromptPolicyRepository([
      promptPolicy(),
      promptPolicy({
        enabled: false,
        id: '30fe0d19-f129-4cd3-b4b7-d8b6cc3cac6a',
        key: 'disabled-policy',
      }),
    ]);
    const listUseCase = new ListPromptPoliciesUseCase(repository);
    const runtime = new PromptPolicyRuntimeService(repository);

    await expect(listUseCase.execute()).resolves.toHaveLength(2);
    await expect(runtime.loadEnabled()).resolves.toEqual([
      expect.objectContaining({ key: 'rich-content-output' }),
    ]);
  });

  it('updates content and increments revision atomically', async () => {
    const policy = promptPolicy();
    const repository = new MemoryPromptPolicyRepository([policy]);
    const useCase = new UpdatePromptPolicyUseCase(repository);

    const updated = await useCase.execute({
      content: ' 使用安全 HTML 和结构化图表。 ',
      description: ' 新描述 ',
      enabled: true,
      expectedRevision: 1,
      id: policy.id,
      name: ' 富内容策略 ',
      priority: 80,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        content: '使用安全 HTML 和结构化图表。',
        description: '新描述',
        name: '富内容策略',
        priority: 80,
        revision: 2,
      }),
    );
  });

  it('rejects stale revisions instead of overwriting newer content', async () => {
    const policy = promptPolicy({ revision: 2 });
    const useCase = new UpdatePromptPolicyUseCase(
      new MemoryPromptPolicyRepository([policy]),
    );

    await expect(
      useCase.execute({
        content: '过期内容',
        description: '',
        enabled: true,
        expectedRevision: 1,
        id: policy.id,
        name: policy.name,
        priority: policy.priority,
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('rejects invalid priority at the application boundary', async () => {
    const policy = promptPolicy();
    const useCase = new UpdatePromptPolicyUseCase(
      new MemoryPromptPolicyRepository([policy]),
    );

    await expect(
      useCase.execute({
        content: policy.content,
        description: '',
        enabled: true,
        expectedRevision: 1,
        id: policy.id,
        name: policy.name,
        priority: 1_001,
      }),
    ).rejects.toMatchObject({ code: 'invalid_operation' });
  });
});
