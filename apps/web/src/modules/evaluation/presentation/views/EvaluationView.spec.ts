// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, type App } from 'vue';

import { useAdminWorkspaceStore } from '@/modules/admin/stores/admin-workspace.store';
import type { ManagementScope } from '@/modules/management-access/domain/management-access';
import { useManagementAccessStore } from '@/modules/management-access/stores/management-access.store';

import EvaluationView from './EvaluationView.vue';

let mountedApp: App<Element> | undefined;

function mountView(scopes: ManagementScope[]): HTMLElement {
  const pinia = createPinia();
  setActivePinia(pinia);

  const accessStore = useManagementAccessStore();
  accessStore.$patch({
    hasCredential: true,
    session: { scopes, subject: 'evaluation-user' },
  });
  vi.spyOn(accessStore, 'validateSession').mockResolvedValue(false);
  vi.spyOn(useAdminWorkspaceStore(), 'initialize').mockResolvedValue();

  const container = document.createElement('div');
  document.body.append(container);
  mountedApp = createApp(EvaluationView);
  mountedApp.use(pinia);
  mountedApp.mount(container);

  return container;
}

afterEach(() => {
  mountedApp?.unmount();
  mountedApp = undefined;
  document.body.innerHTML = '';
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('EvaluationView management gate', () => {
  it('keeps evaluation content hidden without the manage scope', () => {
    const container = mountView(['observability:metrics']);

    expect(container.querySelector('.evaluation-actions')).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      '当前管理凭证缺少评估管理权限。',
    );
  });

  it('shows evaluation controls with the manage scope', () => {
    const container = mountView(['evaluation:manage']);

    expect(container.querySelector('.evaluation-actions')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
