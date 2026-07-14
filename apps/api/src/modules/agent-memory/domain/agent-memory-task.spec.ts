import {
  buildEpisodeIdempotencyKey,
  resolveNextRunAt,
  sanitizeTaskError,
} from './agent-memory-task';

describe('agent memory task domain rules', () => {
  it('builds a stable owner-scoped idempotency key', () => {
    const first = buildEpisodeIdempotencyKey({
      agentId: 'agent-a',
      attachmentIds: ['image-b', 'image-a'],
      conversationId: 'conversation-a',
      ownerKey: 'owner-a',
      userContent: '同一条消息',
    });
    const second = buildEpisodeIdempotencyKey({
      agentId: 'agent-a',
      attachmentIds: ['image-a', 'image-b'],
      conversationId: 'conversation-a',
      ownerKey: 'owner-a',
      userContent: '同一条消息',
    });

    expect(first).toBe(second);
    expect(
      buildEpisodeIdempotencyKey({
        agentId: 'agent-a',
        attachmentIds: ['image-a', 'image-b'],
        conversationId: 'conversation-a',
        ownerKey: 'owner-b',
        userContent: '同一条消息',
      }),
    ).not.toBe(first);
    expect(first).not.toContain('同一条消息');
  });

  it('uses capped exponential backoff', () => {
    const now = new Date('2026-07-14T00:00:00.000Z');

    expect(resolveNextRunAt({ attempts: 1, baseDelayMs: 1_000, now })).toEqual(
      new Date('2026-07-14T00:00:01.000Z'),
    );
    expect(resolveNextRunAt({ attempts: 3, baseDelayMs: 1_000, now })).toEqual(
      new Date('2026-07-14T00:00:04.000Z'),
    );
    expect(resolveNextRunAt({ attempts: 20, baseDelayMs: 1_000, now })).toEqual(
      new Date('2026-07-14T00:05:00.000Z'),
    );
  });

  it('removes image payloads and bearer tokens from task errors', () => {
    const sanitized = sanitizeTaskError(
      new Error(
        'Bearer secret-token data:image/png;base64,iVBORw0KGgoAAA api_key=secret /home/agent/media.png user-visible',
      ),
    );

    expect(sanitized).not.toContain('secret-token');
    expect(sanitized).not.toContain('iVBORw0KGgoAAA');
    expect(sanitized).not.toContain('/home/agent/media.png');
    expect(sanitized).toContain('[redacted]');
    expect(sanitized).toContain('[redacted-base64]');
    expect(sanitized).toContain('[redacted-path]');
  });
});
