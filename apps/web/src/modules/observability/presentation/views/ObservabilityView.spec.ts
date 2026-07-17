// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { createApp, type App } from 'vue';

import type { ManagementScope } from '@/modules/management-access/domain/management-access';
import { useManagementAccessStore } from '@/modules/management-access/stores/management-access.store';

import { useObservabilityStore } from '../../stores/observability.store';
import ObservabilityView from './ObservabilityView.vue';

let mountedApp: App<Element> | undefined;

interface MountedView {
  container: HTMLElement;
  loadFeedbackReviews: MockInstance<
    (status?: 'accepted' | 'pending', page?: number) => Promise<void>
  >;
  refresh: MockInstance<(hours?: number) => Promise<void>>;
}

function mountView(
  scopes: ManagementScope[],
  restoresSession = false,
): MountedView {
  const pinia = createPinia();
  setActivePinia(pinia);

  const accessStore = useManagementAccessStore();
  accessStore.$patch({
    hasCredential: true,
    session: { scopes, subject: 'observability-user' },
  });
  vi.spyOn(accessStore, 'validateSession').mockResolvedValue(restoresSession);

  const store = useObservabilityStore();
  const loadFeedbackReviews = vi
    .spyOn(store, 'loadFeedbackReviews')
    .mockResolvedValue();
  const refresh = vi.spyOn(store, 'refresh').mockResolvedValue();

  const container = document.createElement('div');
  document.body.append(container);
  mountedApp = createApp(ObservabilityView);
  mountedApp.use(pinia);
  mountedApp.mount(container);

  return { container, loadFeedbackReviews, refresh };
}

async function flushMountedTasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  mountedApp?.unmount();
  mountedApp = undefined;
  document.body.innerHTML = '';
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('ObservabilityView management gate', () => {
  it('keeps observability content hidden without the metrics scope', () => {
    const { container } = mountView(['observability:content']);

    expect(container.querySelector('.observability-actions')).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      '当前管理凭证缺少观测指标或反馈审核权限。',
    );
  });

  it('loads only metrics content for a metrics-only session', async () => {
    const { container, loadFeedbackReviews, refresh } = mountView(
      ['observability:metrics'],
      true,
    );

    await flushMountedTasks();

    expect(container.querySelector('.observability-actions')).not.toBeNull();
    expect(
      container.querySelector('.observability-feedback-review'),
    ).toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
    expect(loadFeedbackReviews).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('loads and shows only the review queue for a feedback-only session', async () => {
    const { container, loadFeedbackReviews, refresh } = mountView(
      ['observability:feedback'],
      true,
    );

    await flushMountedTasks();

    expect(
      container.querySelector('.observability-feedback-review'),
    ).not.toBeNull();
    expect(container.textContent).toContain('转换还需评估管理权限');
    expect(container.querySelector('.observability-actions')).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
    expect(loadFeedbackReviews).toHaveBeenCalledWith();
  });

  it('enables conversion messaging only with evaluation management scope', async () => {
    const { container } = mountView(
      ['observability:feedback', 'evaluation:manage'],
      true,
    );

    await flushMountedTasks();

    expect(container.textContent).toContain(
      '仅人工确认后的负反馈可转换为 Evaluation case。',
    );
    expect(container.textContent).not.toContain('转换还需评估管理权限');
  });
});
