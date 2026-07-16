import { defineStore } from 'pinia';
import { ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

import type {
  ObservabilityDashboard,
  ObservabilityTraceDetail,
  ObservabilityTracePage,
} from '../domain/observability-dashboard';

const TRACE_PAGE_SIZE = 10;

const gateway = applicationDependencies.observabilityGateway;

export const useObservabilityStore = defineStore('observability', () => {
  const dashboard = ref<ObservabilityDashboard>();
  const errorMessage = ref('');
  const isLoading = ref(false);
  const isTraceDetailLoading = ref(false);
  const isTraceListLoading = ref(false);
  const selectedTrace = ref<ObservabilityTraceDetail>();
  const traceDetailErrorMessage = ref('');
  const tracePage = ref<ObservabilityTracePage>({
    items: [],
    page: 1,
    pageSize: TRACE_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const tracePageCache = new Map<number, ObservabilityTracePage>();
  const selectedTraceId = ref<string>();
  const windowHours = ref(24);

  async function refresh(hours = windowHours.value): Promise<void> {
    if (isLoading.value) {
      return;
    }

    isLoading.value = true;
    errorMessage.value = '';
    windowHours.value = hours;

    try {
      const [nextDashboard, nextTracePage] = await Promise.all([
        gateway.getDashboard(hours),
        gateway.listTraces({ hours, page: 1, pageSize: TRACE_PAGE_SIZE }),
      ]);

      dashboard.value = nextDashboard;
      tracePage.value = nextTracePage;
      tracePageCache.clear();
      tracePageCache.set(1, nextTracePage);
      closeTrace();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '监控数据加载失败。';
    } finally {
      isLoading.value = false;
    }
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

    isTraceListLoading.value = true;
    errorMessage.value = '';

    try {
      const nextPage = await gateway.listTraces({
        cursor: tracePage.value.nextCursor,
        hours: windowHours.value,
        page,
        pageSize: TRACE_PAGE_SIZE,
      });
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
      errorMessage.value =
        error instanceof Error ? error.message : '执行链路加载失败。';
    } finally {
      isTraceListLoading.value = false;
    }
  }

  async function openTrace(traceId: string): Promise<void> {
    selectedTraceId.value = traceId;
    selectedTrace.value = undefined;
    traceDetailErrorMessage.value = '';
    isTraceDetailLoading.value = true;

    try {
      const detail = await gateway.getTrace(traceId);

      if (selectedTraceId.value === traceId) {
        selectedTrace.value = detail;
      }
    } catch (error) {
      if (selectedTraceId.value === traceId) {
        traceDetailErrorMessage.value =
          error instanceof Error ? error.message : '执行链路详情加载失败。';
      }
    } finally {
      if (selectedTraceId.value === traceId) {
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

  return {
    dashboard,
    closeTrace,
    errorMessage,
    goToTracePage,
    isLoading,
    isTraceDetailLoading,
    isTraceListLoading,
    openTrace,
    refresh,
    selectedTrace,
    selectedTraceId,
    traceDetailErrorMessage,
    tracePage,
    windowHours,
  };
});
