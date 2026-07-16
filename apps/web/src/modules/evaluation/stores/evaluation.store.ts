import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

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
  const errorMessage = ref('');
  const isLoading = ref(false);
  const isSaving = ref(false);
  const runsBySuiteId = ref<Record<string, EvaluationRunDetail[]>>({});
  const selectedRun = ref<EvaluationRunDetail>();
  const suites = ref<EvaluationSuiteSummary[]>([]);

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
    errorMessage.value = '';
    isSaving.value = true;

    try {
      return await operation();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '评估操作失败，请稍后重试。';
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  async function initialize(): Promise<void> {
    if (isLoading.value) {
      return;
    }

    isLoading.value = true;
    errorMessage.value = '';

    try {
      suites.value = await gateway.listSuites();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '评估数据加载失败。';
    } finally {
      isLoading.value = false;
    }
  }

  async function createSuite(input: CreateEvaluationSuiteInput): Promise<void> {
    const created = await execute(() => gateway.createSuite(input));

    suites.value = replaceSuite(suites.value, created);
  }

  async function loadRuns(suiteId: string): Promise<void> {
    runsBySuiteId.value = {
      ...runsBySuiteId.value,
      [suiteId]: await execute(() => gateway.listRuns(suiteId)),
    };
  }

  async function runSuite(suiteId: string): Promise<void> {
    const run = await execute(() => gateway.runSuite(suiteId));
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
    selectedRun.value = await execute(() => gateway.getRun(runId));
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
    runSuite,
    runsBySuiteId,
    selectedRun,
    suites,
  };
});
