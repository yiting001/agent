// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applicationDependencies } from '@/app/dependencies';
import { HttpError } from '@/shared/http/http-client';

import { useManagementAccessStore } from './management-access.store';

describe('useManagementAccessStore', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates a token without retaining it in Pinia state', async () => {
    vi.spyOn(
      applicationDependencies.managementAccessGateway,
      'getSession',
    ).mockResolvedValue({
      scopes: ['observability:metrics'],
      subject: 'operator',
    });
    const store = useManagementAccessStore();

    expect(await store.login('management-secret')).toBe(true);

    expect(store.session?.subject).toBe('operator');
    expect(store.hasScopes(['observability:metrics'])).toBe(true);
    expect(
      store.hasScopes(['observability:metrics', 'evaluation:manage']),
    ).toBe(false);
    expect(JSON.stringify(store.$state)).not.toContain('management-secret');
    expect(window.localStorage.length).toBe(0);
  });

  it('clears an invalid credential and exposes a login-safe error', async () => {
    vi.spyOn(
      applicationDependencies.managementAccessGateway,
      'getSession',
    ).mockRejectedValue(new HttpError('unauthorized', 401));
    const store = useManagementAccessStore();

    expect(await store.login('invalid-secret')).toBe(false);

    expect(store.hasCredential).toBe(false);
    expect(store.session).toBeUndefined();
    expect(store.errorStatus).toBe(401);
    expect(store.errorMessage).not.toContain('invalid-secret');
    expect(window.sessionStorage.length).toBe(0);
  });

  it('retains a credential after a network failure and restores it on retry', async () => {
    vi.spyOn(applicationDependencies.managementAccessGateway, 'getSession')
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({
        scopes: ['evaluation:manage'],
        subject: 'operator',
      });
    const store = useManagementAccessStore();

    expect(await store.login('management-secret')).toBe(false);
    expect(store.hasCredential).toBe(true);
    expect(store.session).toBeUndefined();
    expect(store.errorMessage).toContain('network unavailable');
    expect(JSON.stringify(store.$state)).not.toContain('management-secret');

    expect(await store.validateSession()).toBe(true);
    expect(store.session?.subject).toBe('operator');
    expect(store.errorMessage).toBe('');
  });

  it('does not restore a session when logout wins an in-flight validation', async () => {
    let resolveSession: (
      session: Awaited<
        ReturnType<
          typeof applicationDependencies.managementAccessGateway.getSession
        >
      >,
    ) => void = () => undefined;
    vi.spyOn(
      applicationDependencies.managementAccessGateway,
      'getSession',
    ).mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const store = useManagementAccessStore();
    const login = store.login('management-secret');

    store.logout();
    resolveSession({ scopes: ['observability:metrics'], subject: 'operator' });

    expect(await login).toBe(false);
    expect(store.session).toBeUndefined();
    expect(store.hasCredential).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
  });
});
