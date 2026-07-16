import { scoreContainsKeywords, weightedAverage } from './evaluation-scoring';

describe('evaluation scoring', () => {
  it('按关键词命中比例计算通过状态', () => {
    const result = scoreContainsKeywords(
      { expectedKeywords: ['退款', '人工客服', '时效'] },
      '退款时效为 3 个工作日，可转人工客服。',
      { passingThreshold: 0.8 },
    );

    expect(result).toEqual({
      matchedKeywords: ['人工客服', '时效', '退款'],
      missingKeywords: [],
      score: 1,
      status: 'passed',
    });
  });

  it('缺失关键词时返回失败和缺失列表', () => {
    const result = scoreContainsKeywords(
      { expectedKeywords: ['退款', '人工客服', '时效'] },
      '退款规则需要联系售后。',
      { passingThreshold: 0.8 },
    );

    expect(result).toEqual({
      matchedKeywords: ['退款'],
      missingKeywords: ['人工客服', '时效'],
      score: 1 / 3,
      status: 'failed',
    });
  });

  it('按权重汇总多个分数', () => {
    expect(
      weightedAverage([
        { score: 1, weight: 2 },
        { score: 0.5, weight: 1 },
      ]),
    ).toBeCloseTo(5 / 6);
  });
});
