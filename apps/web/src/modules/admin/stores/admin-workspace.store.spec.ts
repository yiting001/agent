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

  it('replaces edited agents and removes their dependent applications', async () => {
    setActivePinia(createPinia());
    const gateway = applicationDependencies.adminWorkspaceGateway;
    const agent = {
      conversationCount: 2,
      description: '原描述',
      id: 'agent-id',
      moduleIds: ['module-id'],
      name: '原智能体',
      providerId: 'provider-id',
      status: 'draft' as const,
      systemPrompt: '原提示词',
      temperature: 0.2,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const updatedAgent = {
      ...agent,
      description: '新描述',
      name: '新智能体',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    vi.spyOn(gateway, 'listAgents').mockResolvedValue([agent]);
    vi.spyOn(gateway, 'listKnowledgeBases').mockResolvedValue([]);
    vi.spyOn(gateway, 'listModelProviders').mockResolvedValue([]);
    vi.spyOn(gateway, 'listApiApplications').mockResolvedValue([
      {
        agentId: agent.id,
        createdAt: '2026-01-01T00:00:00.000Z',
        endpoint: '/v1/chat/completions',
        id: 'application-id',
        maskedKey: 'ag_live_***',
        name: '官网接入',
        requestCount: 0,
        status: 'ready',
      },
    ]);
    const updateAgent = vi
      .spyOn(gateway, 'updateAgent')
      .mockResolvedValue(updatedAgent);
    const deleteAgent = vi
      .spyOn(gateway, 'deleteAgent')
      .mockResolvedValue(undefined);
    const store = useAdminWorkspaceStore();

    await store.initialize();
    await store.updateAgent(agent.id, {
      description: updatedAgent.description,
      moduleIds: updatedAgent.moduleIds,
      name: updatedAgent.name,
      providerId: updatedAgent.providerId,
      systemPrompt: updatedAgent.systemPrompt,
      temperature: updatedAgent.temperature,
    });

    expect(updateAgent).toHaveBeenCalledWith(
      agent.id,
      expect.objectContaining({ name: '新智能体' }),
    );
    expect(store.agents).toEqual([updatedAgent]);

    await store.deleteAgent(agent.id);

    expect(deleteAgent).toHaveBeenCalledWith(agent.id);
    expect(store.agents).toEqual([]);
    expect(store.apiApplications).toEqual([]);
  });
});
