import { ApplicationError } from '../../../shared/application/application-error';
import type { ObservabilityGeneration } from '../domain/observability-generation';
import { GenerationCaptureService } from './generation-capture.service';
import { ObservabilityGenerationRepository } from './observability-generation.repository';
import { SubmitGenerationFeedbackUseCase } from './submit-generation-feedback.use-case';

const generation: ObservabilityGeneration = {
  actorKeyHash: 'actor-hash',
  agentId: 'agent-1',
  configuration: {
    agentUpdatedAt: '2026-07-16T00:00:00.000Z',
    citationDocumentIds: [],
    policyRevisions: [],
    skillIds: [],
  },
  conversationId: 'conversation-1',
  finishReasons: [],
  id: 'generation-1',
  providerId: 'provider-1',
  providerName: 'OpenAI',
  requestedModel: 'requested-model',
  source: 'public',
  startedAt: new Date('2026-07-16T00:00:00.000Z'),
  status: 'completed',
  traceId: 'trace-1',
};

describe('SubmitGenerationFeedbackUseCase', () => {
  it('按 generation、主体和指标幂等写入脱敏反馈', async () => {
    const upsertFeedback = jest.fn().mockImplementation((feedback) =>
      Promise.resolve({
        ...feedback,
        comment: '[已脱敏]',
      }),
    );
    const repository = {
      findById: jest.fn().mockResolvedValue(generation),
      upsertFeedback,
    } as unknown as ObservabilityGenerationRepository;
    const capture = {
      hashActorKey: jest.fn().mockReturnValue('actor-hash'),
    } as unknown as GenerationCaptureService;
    const useCase = new SubmitGenerationFeedbackUseCase(repository, capture);

    const result = await useCase.execute({
      actorKey: 'owner-key',
      agentId: 'agent-1',
      comment: 'api_key=secret',
      generationId: 'generation-1',
      rating: 'negative',
      reasonCodes: ['incorrect', 'incorrect'],
    });

    expect(upsertFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        actorKeyHash: 'actor-hash',
        comment: '[已脱敏]',
        metric: 'helpfulness',
        rating: 'negative',
        reasonCodes: ['incorrect'],
      }),
    );
    expect(result.comment).toBe('[已脱敏]');
  });

  it('拒绝跨主体和跨智能体反馈', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(generation),
    } as unknown as ObservabilityGenerationRepository;
    const capture = {
      hashActorKey: jest.fn().mockReturnValue('other-actor-hash'),
    } as unknown as GenerationCaptureService;
    const useCase = new SubmitGenerationFeedbackUseCase(repository, capture);
    const command = {
      actorKey: 'other-owner',
      agentId: 'agent-1',
      generationId: 'generation-1',
      rating: 'positive' as const,
      reasonCodes: [],
    };

    await expect(useCase.execute(command)).rejects.toEqual(
      new ApplicationError('unauthorized', '无权评价其他会话的回答。'),
    );
    await expect(
      useCase.execute({ ...command, agentId: 'agent-2' }),
    ).rejects.toEqual(
      new ApplicationError('not_found', '待评价的模型回答不存在。'),
    );
  });
});
