import type { AgentMemory } from '../domain/agent-memory';

/** 一条情景记忆及其综合召回分。 */
export interface RankedEpisode {
  memory: AgentMemory;
  score: number;
}

const REFERENCE_PATTERN =
  /上次|最近|之前|前一(?:个|只|张)|那(?:个|只|张)|图片|照片|图里|画面/;
const VISUAL_DETAIL_PATTERN =
  /颜色|数量|几只|几个|品种|文字|写了什么|长什么样|图片|照片|图里|画面|那(?:个|只|张)/;
const QUERY_NOISE_PATTERN =
  /上次|最近|之前|前一(?:个|只|张)|那(?:个|只|张)|图片|照片|图里|画面|请|帮我|一下|什么|怎样|如何|是否|吗|呢|的|了|是|有|在/g;

/** 将分数约束到可比较的 0-1 区间。 */
function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 去除中文指代噪声并提取去重后的情景检索词。 */
export function extractEpisodeSearchTerms(query: string): string[] {
  const normalized = query
    .toLowerCase()
    .replace(QUERY_NOISE_PATTERN, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const terms = normalized.split(/\s+/).flatMap((term) => {
    if (!term) {
      return [];
    }

    if (/^[\u3400-\u9fff]+$/u.test(term)) {
      return term.length === 1
        ? [term]
        : [term, ...Array.from(term)].filter(
            (candidate) =>
              candidate.length > 1 || !/[我你他她它这]/.test(candidate),
          );
    }

    return term.length > 1 ? [term] : [];
  });

  return [...new Set(terms)];
}

/** 判断问题是否包含历史指代或可检索实体。 */
export function needsEpisodicRecall(query: string): boolean {
  return (
    REFERENCE_PATTERN.test(query) || extractEpisodeSearchTerms(query).length > 0
  );
}

/** 判断回答是否依赖图片中的颜色、数量、文字等视觉证据。 */
export function needsVisualEvidence(query: string): boolean {
  return VISUAL_DETAIL_PATTERN.test(query);
}

/** 将“前一个”等表达转换为结果集偏移量。 */
export function episodeOrdinalOffset(query: string): number {
  return /前一(?:个|只|张)/.test(query) ? 1 : 0;
}

/**
 * 按语义 45%、词法 25%、时间 25%、重要度 5% 组合排序，
 * pending 记忆乘以惩罚系数，避免未完成索引的结果占据首位。
 */
export function rankEpisodes(input: {
  memories: AgentMemory[];
  query: string;
  vectorScores: Map<string, number>;
}): RankedEpisode[] {
  const terms = extractEpisodeSearchTerms(input.query);
  const temporal = REFERENCE_PATTERN.test(input.query);

  return input.memories
    .map((memory, index) => {
      const semantic = clampScore(input.vectorScores.get(memory.id) ?? 0);
      const matches = terms.filter((term) =>
        memory.content.toLowerCase().includes(term),
      ).length;
      const lexical = terms.length > 0 ? matches / terms.length : 0;
      const recency = temporal ? 1 / (index + 1) : 0;
      const importance = memory.importance / 5;
      const pendingPenalty = memory.status === 'pending' ? 0.2 : 1;
      const score =
        (semantic * 0.45 +
          lexical * 0.25 +
          recency * 0.25 +
          importance * 0.05) *
        pendingPenalty;

      return { memory, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.memory.createdAt.getTime() - left.memory.createdAt.getTime(),
    );
}

/** 判断前两名分差是否不足以支持确定性选择。 */
export function isAmbiguous(ranked: RankedEpisode[], margin = 0.08): boolean {
  const first = ranked[0];
  const second = ranked[1];

  return Boolean(first && second && first.score - second.score < margin);
}
