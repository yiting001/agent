// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, nextTick, type App } from 'vue';

import { useManagementAccessStore } from '../../stores/management-access.store';
import ManagementAccessPanel from './ManagementAccessPanel.vue';

let mountedApp: App<Element> | undefined;

afterEach(() => {
  mountedApp?.unmount();
  mountedApp = undefined;
  document.body.innerHTML = '';
  sessionStorage.clear();
});

describe('ManagementAccessPanel', () => {
  it('shows the permission error until the session has every required scope', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const accessStore = useManagementAccessStore();
    accessStore.$patch({
      hasCredential: true,
      session: {
        scopes: ['observability:metrics'],
        subject: 'metrics-reader',
      },
    });

    const container = document.createElement('div');
    document.body.append(container);
    mountedApp = createApp(ManagementAccessPanel, {
      permissionMessage: '缺少评估管理权限。',
      requiredScopes: ['evaluation:manage'],
    });
    mountedApp.use(pinia);
    mountedApp.mount(container);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      '缺少评估管理权限。',
    );

    accessStore.$patch({
      session: {
        scopes: ['observability:metrics', 'evaluation:manage'],
        subject: 'evaluation-manager',
      },
    });
    await nextTick();

    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('accepts a session with any one of the alternative scopes', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const accessStore = useManagementAccessStore();
    accessStore.$patch({
      hasCredential: true,
      session: {
        scopes: ['observability:content'],
        subject: 'content-reader',
      },
    });

    const container = document.createElement('div');
    document.body.append(container);
    mountedApp = createApp(ManagementAccessPanel, {
      permissionMessage: '缺少指标或反馈权限。',
      requiredAnyScopes: ['observability:metrics', 'observability:feedback'],
    });
    mountedApp.use(pinia);
    mountedApp.mount(container);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      '缺少指标或反馈权限。',
    );

    accessStore.$patch({
      session: {
        scopes: ['observability:feedback'],
        subject: 'feedback-reviewer',
      },
    });
    await nextTick();

    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
