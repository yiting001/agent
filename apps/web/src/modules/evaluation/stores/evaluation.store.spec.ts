// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applicationDependencies } from '@/app/dependencies';
import type { EvaluationSuiteSummary } from '@/modules/evaluation/domain/evaluation';
import { useManagementAccessStore } from '@/modules/management-access/stores/management-access.store';
import { HttpError } from '@/shared/http/http-client';

import { useEvaluationStore } from './evaluation.store';

const suite: EvaluationSuiteSummary = {
  agentId: 'agent-id',
  caseCount: 1,
  createdAt: '2026-07-16T00:00:00.000Z',
  description: '回归集',
  id: 'suite-id',
  metricCount: 1,
  name: '核心回归',
  status: 'ready',
  updatedAt: '2026-07-16T00:00:00.000Z',
};

describe('useEvaluationStore management access', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an evaluation-specific permission error', async () => {
    vi.spyOn(
      applicationDependencies.evaluationGateway,
      'listSuites',
    ).mockRejectedValue(new HttpError('forbidden', 403));
    const store = useEvaluationStore();

    await store.initialize();

    expect(store.errorMessage).toContain('评估管理权限');
    expect(store.suites).toEqual([]);
  });

  it('does not expose a suite response that arrives after logout reset', async () => {
    let resolveSuites: (suites: EvaluationSuiteSummary[]) => void = () =>
      undefined;
    vi.spyOn(
      applicationDependencies.evaluationGateway,
      'listSuites',
    ).mockReturnValue(
      new Promise((resolve) => {
        resolveSuites = resolve;
      }),
    );
    const store = useEvaluationStore();
    const loading = store.initialize();

    store.reset();
    resolveSuites([suite]);
    await loading;

    expect(store.suites).toEqual([]);
  });

  it('clears prior evaluation data when the credential expires', async () => {
    vi.spyOn(
      applicationDependencies.managementAccessGateway,
      'getSession',
    ).mockResolvedValue({
      scopes: ['evaluation:manage'],
      subject: 'operator',
    });
    await useManagementAccessStore().login('management-secret');
    vi.spyOn(applicationDependencies.evaluationGateway, 'listSuites')
      .mockResolvedValueOnce([suite])
      .mockRejectedValueOnce(new HttpError('unauthorized', 401));
    const store = useEvaluationStore();

    await store.initialize();
    expect(store.suites).toEqual([suite]);

    await store.initialize();

    expect(store.suites).toEqual([]);
    expect(store.errorMessage).toContain('管理凭证无效');
    expect(useManagementAccessStore().session).toBeUndefined();
    expect(window.sessionStorage.length).toBe(0);
  });
});
