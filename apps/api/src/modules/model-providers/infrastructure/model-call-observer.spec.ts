import {
  estimateChatInputTokens,
  estimateEmbeddingInputTokens,
  estimateTextTokens,
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
