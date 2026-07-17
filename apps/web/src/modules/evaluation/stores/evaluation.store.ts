import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';
import { useManagementAccessStore } from '@/modules/management-access/stores/management-access.store';
import { HttpError } from '@/shared/http/http-client';

import type {
  CreateEvaluationSuiteInput,
  EvaluationRunDetail,
  EvaluationSuiteSummary,
} from '../domain/evaluation';

const gateway = applicationDependencies.evaluationGateway;

function replaceSuite(
  suites: EvaluationSuiteSummary[],
  suite: EvaluationSuiteSummary,
): EvaluationSuiteSummary[] {
  return suites.some((item) => item.id === suite.id)
    ? suites.map((item) => (item.id === suite.id ? suite : item))
    : [suite, ...suites];
}

export const useEvaluationStore = defineStore('evaluation', () => {
  const accessStore = useManagementAccessStore();
  const errorMessage = ref('');
  const isLoading = ref(false);
  const isSaving = ref(false);
  const runsBySuiteId = ref<Record<string, EvaluationRunDetail[]>>({});
  const selectedRun = ref<EvaluationRunDetail>();
  const suites = ref<EvaluationSuiteSummary[]>([]);
  let stateVersion = 0;

  function operationError(error: unknown, fallback: string): string {
    if (error instanceof HttpError && error.status === 401) {
      reset();
      accessStore.invalidate();
      return '管理凭证无效或已失效，请重新登录。';
    }

    if (error instanceof HttpError && error.status === 403) {
      return '当前凭证缺少评估管理权限。';
    }

    return error instanceof Error ? error.message : fallback;
  }

  const latestRuns = computed(() =>
    suites.value
      .map((suite) =>
        suite.latestRun
          ? {
              ...suite.latestRun,
              suiteName: suite.name,
            }
          : undefined,
      )
      .filter((run): run is NonNullable<typeof run> => Boolean(run)),
  );

  async function execute<Output>(
    operation: () => Promise<Output>,
  ): Promise<Output> {
    const requestVersion = stateVersion;

    errorMessage.value = '';
    isSaving.value = true;

    try {
      return await operation();
    } catch (error) {
      if (requestVersion === stateVersion) {
        errorMessage.value = operationError(
          error,
          '评估操作失败，请稍后重试。',
        );
      }
      throw error;
    } finally {
      if (requestVersion === stateVersion) {
        isSaving.value = false;
      }
    }
  }

  async function initialize(): Promise<void> {
    if (isLoading.value) {
      return;
    }

    const requestVersion = stateVersion;

    isLoading.value = true;
    errorMessage.value = '';

    try {
      const nextSuites = await gateway.listSuites();

      if (requestVersion === stateVersion) {
        suites.value = nextSuites;
      }
    } catch (error) {
      if (requestVersion === stateVersion) {
        errorMessage.value = operationError(error, '评估数据加载失败。');
      }
    } finally {
      if (requestVersion === stateVersion) {
        isLoading.value = false;
      }
    }
  }

  async function createSuite(input: CreateEvaluationSuiteInput): Promise<void> {
    const requestVersion = stateVersion;
    const created = await execute(() => gateway.createSuite(input));

    if (requestVersion === stateVersion) {
      suites.value = replaceSuite(suites.value, created);
    }
  }

  async function loadRuns(suiteId: string): Promise<void> {
    const requestVersion = stateVersion;
    const runs = await execute(() => gateway.listRuns(suiteId));

    if (requestVersion === stateVersion) {
      runsBySuiteId.value = {
        ...runsBySuiteId.value,
        [suiteId]: runs,
      };
    }
  }

  async function runSuite(suiteId: string): Promise<void> {
    const requestVersion = stateVersion;
    const run = await execute(() => gateway.runSuite(suiteId));

    if (requestVersion !== stateVersion) {
      return;
    }

    const runs = runsBySuiteId.value[suiteId] ?? [];

    selectedRun.value = run;
    runsBySuiteId.value = {
      ...runsBySuiteId.value,
      [suiteId]: [run, ...runs.filter((item) => item.id !== run.id)],
    };
    suites.value = suites.value.map((suite) =>
      suite.id === suiteId
        ? {
            ...suite,
            latestRun: {
              completedAt: run.completedAt,
              errorMessage: run.errorMessage,
              id: run.id,
              score: run.score,
              startedAt: run.startedAt,
              status: run.status,
              totalCases: run.totalCases,
            },
          }
        : suite,
    );
  }

  async function openRun(runId: string): Promise<void> {
    const requestVersion = stateVersion;
    const run = await execute(() => gateway.getRun(runId));

    if (requestVersion === stateVersion) {
      selectedRun.value = run;
    }
  }

  function reset(): void {
    stateVersion += 1;
    errorMessage.value = '';
    isLoading.value = false;
    isSaving.value = false;
    runsBySuiteId.value = {};
    selectedRun.value = undefined;
    suites.value = [];
  }

  return {
    createSuite,
    errorMessage,
    initialize,
    isLoading,
    isSaving,
    latestRuns,
    loadRuns,
    openRun,
    reset,
    runSuite,
    runsBySuiteId,
    selectedRun,
    suites,
  };
});
