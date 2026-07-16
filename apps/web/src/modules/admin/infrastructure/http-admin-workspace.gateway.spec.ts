import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@/shared/http/http-client';

import { HttpAdminWorkspaceGateway } from './http-admin-workspace.gateway';

class UploadHttpClient implements HttpClient {
  delete<Response>(path: string): Promise<Response> {
    return this.unsupported(path);
  }

  readonly partSizes: number[] = [];
  readonly paths: string[] = [];

  get<Response>(path: string): Promise<Response> {
    return this.unsupported(path);
  }

  patch<Response, Body>(path: string, body: Body): Promise<Response> {
    void body;

    return this.unsupported(path);
  }

  post<Response, Body>(path: string, body: Body): Promise<Response> {
    void body;
    this.paths.push(path);

    if (path.includes('/uploads') && !path.endsWith('/complete')) {
      return Promise.resolve({
        chunkSizeBytes: 4,
        expectedParts: 3,
        id: 'upload-id',
      } as Response);
    }

    return Promise.resolve(undefined as Response);
  }

  postFile<Response>(path: string, body: File): Promise<Response> {
    void body;

    return this.unsupported(path);
  }

  postEventStream<Body>(
    path: string,
    body: Body,
    onEvent: (event: string, data: string) => void,
  ): Promise<void> {
    void body;
    void onEvent;

    return this.unsupported(path);
  }

  put<Response, Body>(path: string, body: Body): Promise<Response> {
    void body;

    return this.unsupported(path);
  }

  putBlob<Response>(path: string, body: Blob): Promise<Response> {
    this.paths.push(path);
    this.partSizes.push(body.size);

    return Promise.resolve(undefined as Response);
  }

  putFile<Response>(path: string, body: File): Promise<Response> {
    void body;

    return this.unsupported(path);
  }

  private unsupported<Response>(path: string): Promise<Response> {
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  }
}

class ChatHttpClient extends UploadHttpClient {
  readonly putBodies: unknown[] = [];

  override postEventStream<Body>(
    path: string,
    body: Body,
    onEvent: (event: string, data: string) => void,
  ): Promise<void> {
    void body;

    if (path !== '/agents/agent-1/chat') {
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    }

    onEvent(
      'metadata',
      JSON.stringify({
        citations: [],
        conversationId: 'conversation-1',
        generationId: 'generation-1',
        traceId: 'trace-1',
      }),
    );
    onEvent('delta', JSON.stringify({ content: '真实回答' }));
    onEvent('done', '{}');

    return Promise.resolve();
  }

  override put<Response, Body>(path: string, body: Body): Promise<Response> {
    this.paths.push(path);
    this.putBodies.push(body);

    return Promise.resolve({
      createdAt: '2026-07-16T00:00:00.000Z',
      id: 'feedback-1',
      metric: 'helpfulness',
      rating: 'negative',
      reasonCodes: ['incorrect'],
      source: 'end_user',
      updatedAt: '2026-07-16T00:00:00.000Z',
    } as Response);
  }
}

describe('HttpAdminWorkspaceGateway', () => {
  it('uploads a file in server-defined chunks and reports progress', async () => {
    const httpClient = new UploadHttpClient();
    const gateway = new HttpAdminWorkspaceGateway(httpClient);
    const progress: number[] = [];
    const file = new File([new Uint8Array(10)], '资料.txt', {
      type: 'text/plain',
    });

    await gateway.uploadKnowledgeFile('module-id', file, (value) => {
      progress.push(value);
    });

    expect(httpClient.partSizes).toEqual([4, 4, 2]);
    expect(progress).toEqual([33, 67, 100]);
    expect(httpClient.paths).toEqual([
      '/knowledge-modules/module-id/uploads',
      '/uploads/upload-id/parts/1',
      '/uploads/upload-id/parts/2',
      '/uploads/upload-id/parts/3',
      '/uploads/upload-id/complete',
    ]);
  });

  it('解析 SSE generation metadata 并提交幂等反馈', async () => {
    const httpClient = new ChatHttpClient();
    const gateway = new HttpAdminWorkspaceGateway(httpClient);
    const deltas: string[] = [];
    const response = await gateway.chat(
      'agent-1',
      'conversation-1',
      'owner-token',
      [{ content: '问题', role: 'user' }],
      (delta) => deltas.push(delta),
    );

    expect(response).toEqual(
      expect.objectContaining({
        answer: '真实回答',
        generationId: 'generation-1',
        traceId: 'trace-1',
      }),
    );
    expect(deltas).toEqual(['真实回答']);

    const feedback = await gateway.submitGenerationFeedback({
      agentId: 'agent-1',
      comment: '事实不准确',
      generationId: response.generationId,
      memoryOwnerToken: 'owner-token',
      rating: 'negative',
      reasonCodes: ['incorrect'],
    });

    expect(feedback.rating).toBe('negative');
    expect(httpClient.paths.at(-1)).toBe(
      '/agents/agent-1/generations/generation-1/feedback',
    );
    expect(httpClient.putBodies.at(-1)).toEqual({
      comment: '事实不准确',
      memoryOwnerToken: 'owner-token',
      rating: 'negative',
      reasonCodes: ['incorrect'],
    });
  });
});
