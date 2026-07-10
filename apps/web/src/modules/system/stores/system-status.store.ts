import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

import type { SystemStatus } from '../domain/system-status';

type RequestState = 'idle' | 'loading' | 'ready' | 'error';

/** Owns presentation state for the system status screen. */
export const useSystemStatusStore = defineStore('system-status', () => {
  const requestState = ref<RequestState>('idle');
  const status = ref<SystemStatus>();
  const errorMessage = ref('');

  const isLoading = computed(() => requestState.value === 'loading');

  async function refresh(): Promise<void> {
    requestState.value = 'loading';
    errorMessage.value = '';

    try {
      status.value = await applicationDependencies.getSystemStatus.execute();
      requestState.value = 'ready';
    } catch (error: unknown) {
      status.value = undefined;
      errorMessage.value =
        error instanceof Error ? error.message : 'Unable to load API status.';
      requestState.value = 'error';
    }
  }

  return {
    errorMessage,
    isLoading,
    refresh,
    requestState,
    status,
  };
});
