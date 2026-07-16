import { readResponseIdentity, readUsage } from './openai-compatible.gateway';

describe('OpenAI compatible response identity', () => {
  it('读取真实响应模型、响应 ID、结束原因和系统指纹', () => {
    expect(
      readResponseIdentity({
        choices: [{ finish_reason: 'stop' }],
        id: 'chatcmpl-1',
        model: 'response-model',
        system_fingerprint: 'fp-1',
      }),
    ).toEqual({
      finishReasons: ['stop'],
      responseModel: 'response-model',
      systemFingerprint: 'fp-1',
      upstreamResponseId: 'chatcmpl-1',
    });
  });

  it('缺少上游字段时返回安全降级结果', () => {
    expect(readResponseIdentity({ choices: [{}] })).toEqual({
      finishReasons: [],
      responseModel: undefined,
      systemFingerprint: undefined,
      upstreamResponseId: undefined,
    });
  });

  it('读取流式或非流式响应中的实际 token usage', () => {
    expect(
      readUsage({
        usage: {
          completion_tokens: 13,
          prompt_tokens: 21,
          total_tokens: 34,
        },
      }),
    ).toEqual({
      inputTokens: 21,
      outputTokens: 13,
    });
    expect(readUsage({})).toBeUndefined();
  });
});
