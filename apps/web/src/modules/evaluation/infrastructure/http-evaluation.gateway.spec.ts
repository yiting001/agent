import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '@/shared/http/http-client';

import { HttpEvaluationGateway } from './http-evaluation.gateway';

describe('HttpEvaluationGateway', () => {
  it('uses evaluation suite and run endpoints', async () => {
    const httpClient: HttpClient = {
      delete: vi.fn(),
      get: vi.fn().mockResolvedValue([]),
      patch: vi.fn(),
      post: vi.fn().mockResolvedValue({ id: 'run-id' }),
      postEventStream: vi.fn(),
      postFile: vi.fn(),
      put: vi.fn(),
      putBlob: vi.fn(),
      putFile: vi.fn(),
    };
    const gateway = new HttpEvaluationGateway(httpClient);

    await gateway.listSuites();
    await gateway.listRuns('suite-id');
    await gateway.runSuite('suite-id');
    await gateway.getRun('run-id');

    expect(httpClient.get).toHaveBeenCalledWith('/evaluation-suites');
    expect(httpClient.get).toHaveBeenCalledWith(
      '/evaluation-suites/suite-id/runs',
    );
    expect(httpClient.post).toHaveBeenCalledWith(
      '/evaluation-suites/suite-id/runs',
      {},
    );
    expect(httpClient.get).toHaveBeenCalledWith('/evaluation-runs/run-id');
  });
});
