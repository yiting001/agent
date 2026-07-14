import { defineStore } from 'pinia';
import { ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

import type { ObservabilityDashboard } from '../domain/observability-dashboard';

const gateway = applicationDependencies.observabilityGateway;

export const useObservabilityStore = defineStore('observability', () => {
  const dashboard = ref<ObservabilityDashboard>();
  const errorMessage = ref('');
  const isLoading = ref(false);
  const windowHours = ref(24);

  async function refresh(hours = windowHours.value): Promise<void> {
    if (isLoading.value) {
      return;
    }

    isLoading.value = true;
    errorMessage.value = '';
    windowHours.value = hours;

    try {
      dashboard.value = await gateway.getDashboard(hours);
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '监控数据加载失败。';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    dashboard,
    errorMessage,
    isLoading,
    refresh,
    windowHours,
  };
});
