import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationConfig } from '../../../config/application.config';

export interface TextChunk {
  content: string;
  index: number;
}

@Injectable()
export class TextChunker {
  private readonly chunkCharacters: number;
  private readonly overlap: number;

  constructor(configService: ConfigService) {
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.chunkCharacters = config.knowledgeChunkCharacters;
    this.overlap = config.knowledgeChunkOverlap;
  }

  split(text: string): TextChunk[] {
    const normalized = text.trim();

    if (!normalized) {
      return [];
    }

    const chunks: TextChunk[] = [];
    let start = 0;

    while (start < normalized.length) {
      const maximumEnd = Math.min(
        start + this.chunkCharacters,
        normalized.length,
      );
      const end = this.findBoundary(normalized, start, maximumEnd);
      const content = normalized.slice(start, end).trim();

      if (content) {
        chunks.push({ content, index: chunks.length });
      }

      if (end >= normalized.length) {
        break;
      }

      start = Math.max(start + 1, end - this.overlap);
    }

    return chunks;
  }

  private findBoundary(
    text: string,
    start: number,
    maximumEnd: number,
  ): number {
    if (maximumEnd === text.length) {
      return maximumEnd;
    }

    const minimumBoundary = start + Math.floor(this.chunkCharacters / 2);
    const candidates = [
      text.lastIndexOf('\n\n', maximumEnd),
      text.lastIndexOf('。', maximumEnd),
      text.lastIndexOf('\n', maximumEnd),
      text.lastIndexOf('；', maximumEnd),
    ];
    const boundary = Math.max(...candidates);

    return boundary >= minimumBoundary ? boundary + 1 : maximumEnd;
  }
}
