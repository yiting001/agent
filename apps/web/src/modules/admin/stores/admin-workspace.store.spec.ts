import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { applicationDependencies } from '@/app/dependencies';

import { useAdminWorkspaceStore } from './admin-workspace.store';

describe('useAdminWorkspaceStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads every management resource from the application gateway', async () => {
    setActivePinia(createPinia());
    const gateway = applicationDependencies.adminWorkspaceGateway;
    const listAgents = vi.spyOn(gateway, 'listAgents').mockResolvedValue([]);
    const listKnowledgeBases = vi
      .spyOn(gateway, 'listKnowledgeBases')
      .mockResolvedValue([]);
    const listModelProviders = vi
      .spyOn(gateway, 'listModelProviders')
      .mockResolvedValue([]);
    const listApiApplications = vi
      .spyOn(gateway, 'listApiApplications')
      .mockResolvedValue([]);
    const store = useAdminWorkspaceStore();

    await store.initialize();

    expect(listAgents).toHaveBeenCalledOnce();
    expect(listKnowledgeBases).toHaveBeenCalledOnce();
    expect(listModelProviders).toHaveBeenCalledOnce();
    expect(listApiApplications).toHaveBeenCalledOnce();
    expect(store.errorMessage).toBe('');
    expect(store.isLoading).toBe(false);
  });

  it('exposes backend loading failures to the management UI', async () => {
    setActivePinia(createPinia());
    const gateway = applicationDependencies.adminWorkspaceGateway;

    vi.spyOn(gateway, 'listAgents').mockRejectedValue(
      new Error('后端暂时不可用'),
    );
    vi.spyOn(gateway, 'listKnowledgeBases').mockResolvedValue([]);
    vi.spyOn(gateway, 'listModelProviders').mockResolvedValue([]);
    vi.spyOn(gateway, 'listApiApplications').mockResolvedValue([]);
    const store = useAdminWorkspaceStore();

    await store.initialize();

    expect(store.errorMessage).toBe('后端暂时不可用');
    expect(store.isLoading).toBe(false);
  });
});
