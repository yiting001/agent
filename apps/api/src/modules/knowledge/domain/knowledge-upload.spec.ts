import {
  buildKnowledgeChunkId,
  resolveIngestionNextRunAt,
  sanitizeIngestionError,
} from './knowledge-upload';

describe('knowledge ingestion task rules', () => {
  it('keeps vector ids stable across retries and separates chunk indexes', () => {
    expect(buildKnowledgeChunkId('document-a', 0)).toBe(
      buildKnowledgeChunkId('document-a', 0),
    );
    expect(buildKnowledgeChunkId('document-a', 0)).not.toBe(
      buildKnowledgeChunkId('document-a', 1),
    );
  });

  it('uses exponential retry backoff and redacts sensitive failures', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    expect(
      resolveIngestionNextRunAt({
        attempts: 3,
        baseDelayMs: 1_000,
        now,
      }).getTime(),
    ).toBe(now.getTime() + 4_000);
    expect(
      sanitizeIngestionError(
        new Error('Bearer secret-token failed at /srv/private/file.txt'),
      ),
    ).toBe('Bearer [redacted] failed at [redacted-path]');
  });
});
