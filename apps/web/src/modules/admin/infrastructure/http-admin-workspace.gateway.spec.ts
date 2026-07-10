import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@/shared/http/http-client';

import { HttpAdminWorkspaceGateway } from './http-admin-workspace.gateway';

class UploadHttpClient implements HttpClient {
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

  put<Response, Body>(path: string, body: Body): Promise<Response> {
    void body;

    return this.unsupported(path);
  }

  putBlob<Response>(path: string, body: Blob): Promise<Response> {
    this.paths.push(path);
    this.partSizes.push(body.size);

    return Promise.resolve(undefined as Response);
  }

  private unsupported<Response>(path: string): Promise<Response> {
    return Promise.reject(new Error(`Unexpected request: ${path}`));
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
});
