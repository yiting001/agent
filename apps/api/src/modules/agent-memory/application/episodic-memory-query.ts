import type { AgentMemory } from '../domain/agent-memory';

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

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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

export function needsEpisodicRecall(query: string): boolean {
  return (
    REFERENCE_PATTERN.test(query) || extractEpisodeSearchTerms(query).length > 0
  );
}

export function needsVisualEvidence(query: string): boolean {
  return VISUAL_DETAIL_PATTERN.test(query);
}

export function episodeOrdinalOffset(query: string): number {
  return /前一(?:个|只|张)/.test(query) ? 1 : 0;
}

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

export function isAmbiguous(ranked: RankedEpisode[], margin = 0.08): boolean {
  const first = ranked[0];
  const second = ranked[1];

  return Boolean(first && second && first.score - second.score < margin);
}
