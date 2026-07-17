import { afterEach, describe, expect, it, vi } from 'vitest';

import { FetchHttpClient, HttpError } from './http-client';

describe('FetchHttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds the current management bearer token when a provider is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ subject: 'operator' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new FetchHttpClient('/api', () => 'management-secret');

    await client.get('/management-access/session');

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(request.headers);

    expect(headers.get('Authorization')).toBe('Bearer management-secret');
  });

  it('keeps ordinary clients free of management authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new FetchHttpClient('/api');

    await client.get('/public/agents');

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(new Headers(request.headers).has('Authorization')).toBe(false);
  });

  it('preserves the HTTP status and redacts a token echoed by an error response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ message: '凭证 management-secret 没有访问权限' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 403,
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new FetchHttpClient('/api', () => 'management-secret');

    const failure = await client
      .get('/protected')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect(failure).toMatchObject({ status: 403 });
    expect((failure as Error).message).toContain('[REDACTED]');
    expect((failure as Error).message).not.toContain('management-secret');
  });
});
