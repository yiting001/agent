// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { createApp, nextTick, type App } from 'vue';

import type {
  FeedbackReviewItem,
  FeedbackReviewQueueStatus,
} from '../../domain/feedback-review';
import { useObservabilityStore } from '../../stores/observability.store';
import ObservabilityFeedbackReviewQueue from './ObservabilityFeedbackReviewQueue.vue';

const acceptedReview: FeedbackReviewItem = {
  agentId: 'agent-id',
  comment: '回答不准确',
  createdAt: '2026-07-16T00:00:00.000Z',
  expectedOutput: '正确答案',
  feedbackId: 'feedback-id',
  generationId: 'generation-id',
  input: '脱敏问题',
  rating: 'negative',
  reasonCodes: ['incorrect'],
  reviewStatus: 'accepted',
  truncated: false,
  updatedAt: '2026-07-16T00:00:00.000Z',
};

let mountedApp: App<Element> | undefined;
type ObservabilityStore = ReturnType<typeof useObservabilityStore>;

interface MountedQueue {
  container: HTMLElement;
  loadFeedbackReviews: MockInstance<
    (status?: FeedbackReviewQueueStatus, page?: number) => Promise<void>
  >;
  openConversion: MockInstance<(review: FeedbackReviewItem) => Promise<void>>;
  store: ObservabilityStore;
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const match = [...container.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label,
  );

  if (!(match instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${label}`);
  }

  return match;
}

async function click(element: HTMLButtonElement): Promise<void> {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await Promise.resolve();
  await nextTick();
}

function mountQueue(canConvert: boolean): MountedQueue {
  const pinia = createPinia();
  setActivePinia(pinia);

  const store = useObservabilityStore();
  const loadFeedbackReviews = vi
    .spyOn(store, 'loadFeedbackReviews')
    .mockImplementation(async (status, page = 1) => {
      store.feedbackReviewPage = {
        items: status === 'accepted' ? [acceptedReview] : [],
        page,
        pageSize: 20,
        total: status === 'accepted' ? 21 : 0,
        totalPages: status === 'accepted' ? 2 : 0,
      };
    });
  const openConversion = vi
    .spyOn(store, 'openFeedbackReviewConversion')
    .mockResolvedValue();
  const container = document.createElement('div');
  document.body.append(container);
  mountedApp = createApp(ObservabilityFeedbackReviewQueue, { canConvert });
  mountedApp.use(pinia);
  mountedApp.mount(container);

  return { container, loadFeedbackReviews, openConversion, store };
}

afterEach(() => {
  mountedApp?.unmount();
  mountedApp = undefined;
  document.body.innerHTML = '';
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('ObservabilityFeedbackReviewQueue', () => {
  it('restores accepted reviews and keeps their status during pagination', async () => {
    const { container, loadFeedbackReviews, openConversion, store } =
      mountQueue(true);

    await click(button(container, '已接受'));

    expect(loadFeedbackReviews).toHaveBeenCalledWith('accepted', 1);
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.textContent).toContain('已接受');

    await click(button(container, '转换'));
    expect(openConversion).toHaveBeenCalledWith(acceptedReview);

    const nextPage = container.querySelector('[aria-label="下一页审核反馈"]');

    if (!(nextPage instanceof HTMLButtonElement)) {
      throw new Error('Next review page button not found');
    }

    await click(nextPage);
    expect(loadFeedbackReviews).toHaveBeenLastCalledWith('accepted', 2);

    store.feedbackReviewErrorMessage = 'temporary failure';
    await nextTick();
    loadFeedbackReviews.mockClear();
    await click(button(container, '重试'));
    expect(loadFeedbackReviews).toHaveBeenCalledWith('accepted', 2);
  });

  it('keeps accepted reviews read-only without evaluation scope', async () => {
    const { container, openConversion } = mountQueue(false);

    await click(button(container, '已接受'));

    expect(container.textContent).toContain('只读：转换需评估管理权限');
    expect(
      [...container.querySelectorAll('button')].some(
        (item) => item.textContent?.trim() === '转换',
      ),
    ).toBe(false);
    expect(openConversion).not.toHaveBeenCalled();
  });
});
