import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { GenerationCaptureService } from './generation-capture.service';
import { ObservabilityGenerationRepository } from './observability-generation.repository';
import { ObservabilityService } from './observability.service';
import { ObservabilityTraceContext } from './observability-trace.context';

function createService(
  captureMode: ApplicationConfig['observabilityContentCaptureMode'],
): {
  repository: {
    complete: jest.Mock;
    deleteExpiredContents: jest.Mock;
    start: jest.Mock;
    updateModel: jest.Mock;
  };
  service: GenerationCaptureService;
} {
  const repository = {
    complete: jest.fn().mockResolvedValue(undefined),
    deleteExpiredContents: jest.fn().mockResolvedValue(undefined),
    start: jest.fn().mockResolvedValue(undefined),
    updateModel: jest.fn().mockResolvedValue(undefined),
  };
  const context = {
    current: jest.fn().mockReturnValue({ traceId: 'trace-context' }),
  } as unknown as ObservabilityTraceContext;
  const observability = {
    createTraceId: jest.fn().mockReturnValue('created-trace'),
  } as unknown as ObservabilityService;
  const config = {
    getOrThrow: jest.fn().mockReturnValue({
      observabilityContentCaptureMode: captureMode,
      observabilityContentMaxCharacters: 5,
      observabilityContentRetentionDays: 7,
    }),
  } as unknown as ConfigService;

  return {
    repository,
    service: new GenerationCaptureService(
      repository as unknown as ObservabilityGenerationRepository,
      context,
      observability,
      config,
    ),
  };
}

describe('GenerationCaptureService', () => {
  it('创建 generation、保存脱敏输入并完成脱敏输出', async () => {
    const { repository, service } = createService('redacted');
    const identity = await service.start({
      actorKey: 'owner-key',
      agentId: 'agent-1',
      configuration: {
        agentUpdatedAt: '2026-07-16T00:00:00.000Z',
        citationDocumentIds: [],
        policyRevisions: [],
        skillIds: [],
      },
      inputMessages: [
        { content: 'user@test.com', role: 'user' },
        { content: '[图片内容已省略]', role: 'user' },
      ],
      providerId: 'provider-1',
      providerName: '供应商',
      requestedModel: 'requested-model',
      source: 'public',
    });

    expect(identity.traceId).toBe('trace-context');
    expect(repository.start).toHaveBeenCalledWith(
      expect.objectContaining({
        actorKeyHash: service.hashActorKey('owner-key'),
        id: identity.generationId,
        requestedModel: 'requested-model',
        status: 'running',
      }),
      expect.objectContaining({
        captureMode: 'redacted',
        inputMessages: [
          { content: '[已脱敏]', role: 'user' },
          { content: '', role: 'user' },
        ],
        truncated: true,
      }),
    );

    await service.complete(identity.generationId, 'Bearer secret-token');

    expect(repository.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        generationId: identity.generationId,
        output: {
          redactionCount: 1,
          text: '[已脱敏]',
          truncated: false,
        },
        status: 'completed',
      }),
    );
  });

  it('off 模式只保存 generation 元数据', async () => {
    const { repository, service } = createService('off');
    const identity = await service.start({
      agentId: 'agent-1',
      configuration: {
        agentUpdatedAt: '2026-07-16T00:00:00.000Z',
        citationDocumentIds: [],
        policyRevisions: [],
        skillIds: [],
      },
      inputMessages: [{ content: '正文', role: 'user' }],
      providerId: 'provider-1',
      providerName: '供应商',
      requestedModel: 'requested-model',
      source: 'admin',
    });

    expect(repository.start).toHaveBeenCalledWith(
      expect.objectContaining({ id: identity.generationId }),
      undefined,
    );

    await service.fail(identity.generationId, '错误正文');

    expect(repository.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        output: undefined,
        status: 'error',
      }),
    );
  });
});
