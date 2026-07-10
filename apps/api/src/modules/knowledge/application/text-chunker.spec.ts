import type { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';
import { TextChunker } from './text-chunker';

function createConfigService(
  chunkCharacters: number,
  overlap: number,
): ConfigService {
  const config = {
    knowledgeChunkCharacters: chunkCharacters,
    knowledgeChunkOverlap: overlap,
  } as ApplicationConfig;

  return {
    getOrThrow: () => config,
  } as unknown as ConfigService;
}

describe('TextChunker', () => {
  it('creates overlapping chunks near sentence boundaries', () => {
    const chunker = new TextChunker(createConfigService(12, 3));
    const chunks = chunker.split('第一段内容。第二段内容。第三段内容。');

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.index)).toEqual(
      chunks.map((_, index) => index),
    );
    expect(chunks[0]?.content.endsWith('。')).toBe(true);
    expect(chunks.every((chunk) => chunk.content.length <= 12)).toBe(true);
  });

  it('returns no chunks for blank content', () => {
    const chunker = new TextChunker(createConfigService(12, 3));

    expect(chunker.split(' \n ')).toEqual([]);
  });
});
