import type { AgentMemory } from '../domain/agent-memory';
import {
  episodeOrdinalOffset,
  extractEpisodeSearchTerms,
  isAmbiguous,
  needsVisualEvidence,
  rankEpisodes,
} from './episodic-memory-query';

function episode(id: string, content: string, createdAt: string): AgentMemory {
  return {
    accessCount: 0,
    agentId: 'agent-1',
    content,
    createdAt: new Date(createdAt),
    id,
    importance: 3,
    ownerKey: 'owner-1',
    status: 'ready',
    type: 'episodic',
    updatedAt: new Date(createdAt),
  };
}

describe('episodic memory query', () => {
  const recentDog = episode(
    'recent-dog',
    '情景摘要：用户分享了一只金毛犬。',
    '2026-01-02T00:00:00.000Z',
  );
  const previousDog = episode(
    'previous-dog',
    '情景摘要：用户分享了一只柯基犬。',
    '2026-01-01T00:00:00.000Z',
  );

  it('解析中文时间指代和实体词', () => {
    expect(extractEpisodeSearchTerms('上次那只狗是什么品种？')).toContain('狗');
    expect(needsVisualEvidence('上次那只狗是什么颜色？')).toBe(true);
  });

  it('最近一次优先，前一次通过序位选择第二个候选', () => {
    const ranked = rankEpisodes({
      memories: [recentDog, previousDog],
      query: '最近那只狗',
      vectorScores: new Map([
        ['recent-dog', 0.8],
        ['previous-dog', 0.8],
      ]),
    });

    expect(ranked[0]?.memory.id).toBe('recent-dog');
    expect(episodeOrdinalOffset('前一只狗')).toBe(1);
    expect(ranked.slice(episodeOrdinalOffset('前一只狗'))[0]?.memory.id).toBe(
      'previous-dog',
    );
  });

  it('两个近似候选得分接近时要求澄清', () => {
    const ranked = rankEpisodes({
      memories: [recentDog, previousDog],
      query: '狗',
      vectorScores: new Map([
        ['recent-dog', 0.8],
        ['previous-dog', 0.79],
      ]),
    });

    expect(isAmbiguous(ranked)).toBe(true);
  });
});
