import { GenerationCaptureService } from '../../observability/application/generation-capture.service';
import { ObservabilityService } from '../../observability/application/observability.service';
import {
  estimateChatInputTokens,
  estimateEmbeddingInputTokens,
  estimateTextTokens,
  ModelCallObservation,
} from './model-call-observer';

describe('model token estimation', () => {
  it('分别估算中英文文本且忽略多模态二进制内容', () => {
    expect(estimateTextTokens('企业知识')).toBe(4);
    expect(estimateTextTokens('abcdefgh')).toBe(2);
    expect(
      estimateChatInputTokens([
        {
          content: [
            { text: '你好', type: 'text' },
            {
              image_url: { url: 'data:image/png;base64,very-large-content' },
              type: 'image_url',
            },
          ],
          role: 'user',
        },
      ]),
    ).toBeGreaterThanOrEqual(2);
  });

  it('汇总嵌入批次的文本估算值', () => {
    expect(estimateEmbeddingInputTokens(['知识', 'abcdefgh'])).toBe(4);
  });
});

describe('ModelCallObservation', () => {
  it('同时记录请求模型和上游实际响应模型', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const captureModelResponse = jest.fn().mockResolvedValue(undefined);
    const observation = new ModelCallObservation(
      { record } as unknown as ObservabilityService,
      { captureModelResponse } as unknown as GenerationCaptureService,
      {
        estimatedInputTokens: 5,
        generationId: 'generation-1',
        operation: 'chat.generate',
        providerId: 'provider-1',
        providerName: '供应商',
        requestedModel: 'requested-model',
        traceId: 'trace-1',
      },
    );

    observation.addOutput('回答');
    observation.captureResponse({
      finishReasons: ['stop'],
      responseModel: 'response-model',
      upstreamResponseId: 'chatcmpl-1',
    });
    await observation.complete();

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        finishReasons: ['stop'],
        generationId: 'generation-1',
        model: 'response-model',
        requestedModel: 'requested-model',
        responseModel: 'response-model',
        upstreamResponseId: 'chatcmpl-1',
      }),
    );
    expect(captureModelResponse).toHaveBeenCalledWith('generation-1', {
      finishReasons: ['stop'],
      responseModel: 'response-model',
      upstreamResponseId: 'chatcmpl-1',
    });
  });
});
