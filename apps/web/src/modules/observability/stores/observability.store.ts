import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';
import { useManagementAccessStore } from '@/modules/management-access/stores/management-access.store';
import { HttpError } from '@/shared/http/http-client';

import type {
  ConvertFeedbackReviewInput,
  DecideFeedbackReviewInput,
  FeedbackReviewConversionResult,
  FeedbackReviewItem,
  FeedbackReviewPage,
  FeedbackReviewQueueStatus,
} from '../domain/feedback-review';
import type {
  ObservabilityDashboard,
  ObservabilityTraceDetail,
  ObservabilityTracePage,
} from '../domain/observability-dashboard';

import {
  createManagementRequestError,
  emptyFeedbackReviewPage,
  emptyTracePage,
  FEEDBACK_REVIEW_PAGE_SIZE,
  type FailedDecision,
  TRACE_PAGE_SIZE,
} from './observability-store-state';

const evaluationGateway = applicationDependencies.evaluationGateway;
const gateway = applicationDependencies.observabilityGateway;

export const useObservabilityStore = defineStore('observability', () => {
  const accessStore = useManagementAccessStore();
  const requestError = createManagementRequestError(() => {
    reset();
    accessStore.invalidate();
  });
  const dashboard = ref<ObservabilityDashboard>();
  const errorMessage = ref('');
  const feedbackReviewActionError = ref('');
  const feedbackReviewActionId = ref('');
  const feedbackReviewErrorMessage = ref('');
  const feedbackReviewPage = ref<FeedbackReviewPage>(emptyFeedbackReviewPage());
  const isConvertingFeedback = ref(false);
  const isFeedbackReviewLoading = ref(false);
  const isLoading = ref(false);
  const isPreparingConversion = ref(false);
  const isTraceDetailLoading = ref(false);
  const isTraceListLoading = ref(false);
  const lastFailedDecision = ref<FailedDecision>();
  const conversionErrorMessage = ref('');
  const conversionResult = ref<FeedbackReviewConversionResult>();
  const conversionSuites = ref<
    Awaited<ReturnType<typeof evaluationGateway.listSuites>>
  >([]);
  const selectedFeedbackReview = ref<FeedbackReviewItem>();
  const selectedTrace = ref<ObservabilityTraceDetail>();
  const traceDetailErrorMessage = ref('');
  const tracePage = ref<ObservabilityTracePage>(emptyTracePage());
  const tracePageCache = new Map<number, ObservabilityTracePage>();
  const selectedTraceId = ref<string>();
  const windowHours = ref(24);
  let stateVersion = 0;
  const canRetryFeedbackReviewDecision = computed(() =>
    Boolean(lastFailedDecision.value),
  );

  async function refresh(hours = windowHours.value): Promise<void> {
    if (isLoading.value) {
      return;
    }

    const requestVersion = stateVersion;

    isLoading.value = true;
    errorMessage.value = '';
    windowHours.value = hours;

    try {
      const [nextDashboard, nextTracePage] = await Promise.all([
        gateway.getDashboard(hours),
        gateway.listTraces({ hours, page: 1, pageSize: TRACE_PAGE_SIZE }),
      ]);

      if (requestVersion !== stateVersion) {
        return;
      }

      dashboard.value = nextDashboard;
      tracePage.value = nextTracePage;
      tracePageCache.clear();
      tracePageCache.set(1, nextTracePage);
      closeTrace();
    } catch (error) {
      if (requestVersion !== stateVersion) {
        return;
      }

      errorMessage.value = requestError(
        error,
        '当前凭证缺少观测指标权限。',
        '监控数据加载失败。',
      );
    } finally {
      if (requestVersion === stateVersion) {
        isLoading.value = false;
      }
    }
  }

  async function loadFeedbackReviews(
    status: FeedbackReviewQueueStatus = 'pending',
    page = 1,
  ): Promise<void> {
    if (isFeedbackReviewLoading.value || page < 1) {
      return;
    }

    const requestVersion = stateVersion;
    isFeedbackReviewLoading.value = true;
    feedbackReviewErrorMessage.value = '';

    try {
      const nextPage = await gateway.listFeedbackReviews(
        status,
        page,
        FEEDBACK_REVIEW_PAGE_SIZE,
      );

      if (requestVersion !== stateVersion) {
        return;
      }

      feedbackReviewPage.value = nextPage;
      feedbackReviewActionError.value = '';
      lastFailedDecision.value = undefined;
    } catch (error) {
      if (requestVersion !== stateVersion) {
        return;
      }

      feedbackReviewErrorMessage.value = requestError(
        error,
        '当前凭证缺少反馈审核权限。',
        '反馈审核队列加载失败。',
      );
    } finally {
      if (requestVersion === stateVersion) {
        isFeedbackReviewLoading.value = false;
      }
    }
  }

  async function decideFeedbackReview(
    feedbackId: string,
    input: DecideFeedbackReviewInput,
  ): Promise<FeedbackReviewItem | undefined> {
    if (feedbackReviewActionId.value) {
      return undefined;
    }

    const requestVersion = stateVersion;

    feedbackReviewActionId.value = feedbackId;
    feedbackReviewActionError.value = '';
    lastFailedDecision.value = undefined;

    try {
      const updated = await gateway.decideFeedbackReview(feedbackId, input);

      if (requestVersion !== stateVersion) {
        return undefined;
      }

      const remainingItems = feedbackReviewPage.value.items.filter(
        (item) => item.feedbackId !== feedbackId,
      );
      const total = Math.max(0, feedbackReviewPage.value.total - 1);

      feedbackReviewPage.value = {
        ...feedbackReviewPage.value,
        items: remainingItems,
        total,
        totalPages: Math.ceil(total / FEEDBACK_REVIEW_PAGE_SIZE),
      };

      return updated;
    } catch (error) {
      if (requestVersion !== stateVersion) {
        return undefined;
      }

      if (error instanceof HttpError && error.status === 409) {
        feedbackReviewActionError.value =
          '反馈已被更新或处置，请刷新队列后重新审核。';
      } else {
        feedbackReviewActionError.value = requestError(
          error,
          '当前凭证缺少反馈审核权限。',
          '反馈处置失败，请重试。',
        );
        lastFailedDecision.value = { feedbackId, input };
      }
      return undefined;
    } finally {
      if (requestVersion === stateVersion) {
        feedbackReviewActionId.value = '';
      }
    }
  }

  async function retryFeedbackReviewDecision(): Promise<
    FeedbackReviewItem | undefined
  > {
    const failed = lastFailedDecision.value;

    return failed
      ? decideFeedbackReview(failed.feedbackId, failed.input)
      : undefined;
  }

  async function openFeedbackReviewConversion(
    review: FeedbackReviewItem,
  ): Promise<void> {
    selectedFeedbackReview.value = review;
    conversionErrorMessage.value = '';
    conversionResult.value = undefined;
    await loadConversionSuites();
  }

  async function loadConversionSuites(): Promise<void> {
    const review = selectedFeedbackReview.value;

    if (!review || isPreparingConversion.value) {
      return;
    }

    const requestVersion = stateVersion;

    isPreparingConversion.value = true;
    conversionErrorMessage.value = '';

    try {
      const suites = await evaluationGateway.listSuites();

      if (requestVersion !== stateVersion) {
        return;
      }

      conversionSuites.value = suites.filter(
        (suite) => suite.agentId === review.agentId,
      );
    } catch (error) {
      if (requestVersion !== stateVersion) {
        return;
      }

      conversionSuites.value = [];
      conversionErrorMessage.value = requestError(
        error,
        '当前凭证缺少评估管理权限。',
        '评估集加载失败，请重试。',
      );
    } finally {
      if (requestVersion === stateVersion) {
        isPreparingConversion.value = false;
      }
    }
  }

  async function convertFeedbackReview(
    input: ConvertFeedbackReviewInput,
  ): Promise<boolean> {
    const review = selectedFeedbackReview.value;

    if (!review || isConvertingFeedback.value) {
      return false;
    }

    const requestVersion = stateVersion;

    isConvertingFeedback.value = true;
    conversionErrorMessage.value = '';

    try {
      const result = await gateway.convertFeedbackReview(
        review.feedbackId,
        input,
      );

      if (requestVersion !== stateVersion) {
        return false;
      }

      conversionResult.value = result;
      selectedFeedbackReview.value = undefined;
      conversionSuites.value = [];
      return true;
    } catch (error) {
      if (requestVersion !== stateVersion) {
        return false;
      }

      conversionErrorMessage.value = requestError(
        error,
        '当前凭证缺少评估管理或反馈审核权限。',
        '转换 Evaluation case 失败，请重试。',
      );
      return false;
    } finally {
      if (requestVersion === stateVersion) {
        isConvertingFeedback.value = false;
      }
    }
  }

  function closeFeedbackReviewConversion(): void {
    if (isConvertingFeedback.value) {
      return;
    }

    selectedFeedbackReview.value = undefined;
    conversionErrorMessage.value = '';
    conversionSuites.value = [];
  }

  async function goToTracePage(page: number): Promise<void> {
    if (
      isTraceListLoading.value ||
      page < 1 ||
      page > tracePage.value.totalPages ||
      page === tracePage.value.page
    ) {
      return;
    }

    const cachedPage = tracePageCache.get(page);

    if (cachedPage) {
      tracePage.value = cachedPage;
      return;
    }

    if (page !== tracePage.value.page + 1 || !tracePage.value.nextCursor) {
      return;
    }

    const requestVersion = stateVersion;

    isTraceListLoading.value = true;
    errorMessage.value = '';

    try {
      const nextPage = await gateway.listTraces({
        cursor: tracePage.value.nextCursor,
        hours: windowHours.value,
        page,
        pageSize: TRACE_PAGE_SIZE,
      });

      if (requestVersion !== stateVersion) {
        return;
      }

      const firstPage = tracePageCache.get(1);
      const stablePage = firstPage
        ? {
            ...nextPage,
            total: firstPage.total,
            totalPages: firstPage.totalPages,
          }
        : nextPage;

      tracePageCache.set(page, stablePage);
      tracePage.value = stablePage;
    } catch (error) {
      if (requestVersion !== stateVersion) {
        return;
      }

      errorMessage.value = requestError(
        error,
        '当前凭证缺少观测指标权限。',
        '执行链路加载失败。',
      );
    } finally {
      if (requestVersion === stateVersion) {
        isTraceListLoading.value = false;
      }
    }
  }

  async function openTrace(traceId: string): Promise<void> {
    const requestVersion = stateVersion;

    selectedTraceId.value = traceId;
    selectedTrace.value = undefined;
    traceDetailErrorMessage.value = '';
    isTraceDetailLoading.value = true;

    try {
      const detail = await gateway.getTrace(traceId);

      if (
        requestVersion === stateVersion &&
        selectedTraceId.value === traceId
      ) {
        selectedTrace.value = detail;
      }
    } catch (error) {
      if (
        requestVersion === stateVersion &&
        selectedTraceId.value === traceId
      ) {
        traceDetailErrorMessage.value = requestError(
          error,
          '当前凭证缺少 Trace 正文权限。',
          '执行链路详情加载失败。',
        );
      }
    } finally {
      if (
        requestVersion === stateVersion &&
        selectedTraceId.value === traceId
      ) {
        isTraceDetailLoading.value = false;
      }
    }
  }

  function closeTrace(): void {
    selectedTraceId.value = undefined;
    selectedTrace.value = undefined;
    traceDetailErrorMessage.value = '';
    isTraceDetailLoading.value = false;
  }

  function reset(): void {
    stateVersion += 1;
    dashboard.value = undefined;
    errorMessage.value = '';
    feedbackReviewActionError.value = '';
    feedbackReviewActionId.value = '';
    feedbackReviewErrorMessage.value = '';
    feedbackReviewPage.value = emptyFeedbackReviewPage();
    isConvertingFeedback.value = false;
    isFeedbackReviewLoading.value = false;
    isLoading.value = false;
    isPreparingConversion.value = false;
    isTraceListLoading.value = false;
    lastFailedDecision.value = undefined;
    conversionErrorMessage.value = '';
    conversionResult.value = undefined;
    conversionSuites.value = [];
    selectedFeedbackReview.value = undefined;
    tracePage.value = emptyTracePage();
    tracePageCache.clear();
    closeTrace();
  }

  return {
    canRetryFeedbackReviewDecision,
    closeFeedbackReviewConversion,
    closeTrace,
    conversionErrorMessage,
    conversionResult,
    conversionSuites,
    convertFeedbackReview,
    dashboard,
    decideFeedbackReview,
    errorMessage,
    feedbackReviewActionError,
    feedbackReviewActionId,
    feedbackReviewErrorMessage,
    feedbackReviewPage,
    goToTracePage,
    isConvertingFeedback,
    isFeedbackReviewLoading,
    isLoading,
    isPreparingConversion,
    isTraceDetailLoading,
    isTraceListLoading,
    loadConversionSuites,
    loadFeedbackReviews,
    openFeedbackReviewConversion,
    openTrace,
    refresh,
    reset,
    retryFeedbackReviewDecision,
    selectedFeedbackReview,
    selectedTrace,
    selectedTraceId,
    traceDetailErrorMessage,
    tracePage,
    windowHours,
  };
});
