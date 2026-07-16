<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useAdminWorkspaceStore } from '@/modules/admin/stores/admin-workspace.store';
import { formatDate } from '@/modules/admin/presentation/admin-display';
import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';
import BaseModal from '@/modules/admin/presentation/components/BaseModal.vue';

import { useEvaluationStore } from '../../stores/evaluation.store';
import EvaluationRunDetail from '../components/EvaluationRunDetail.vue';
import EvaluationSuiteForm from '../components/EvaluationSuiteForm.vue';

const evaluationStore = useEvaluationStore();
const workspaceStore = useAdminWorkspaceStore();
const createModalOpen = ref(false);
const selectedSuiteId = ref('');

const selectedSuiteRuns = computed(
  () => evaluationStore.runsBySuiteId[selectedSuiteId.value] ?? [],
);
const selectedSuite = computed(() =>
  evaluationStore.suites.find((suite) => suite.id === selectedSuiteId.value),
);
const availableAgents = computed(() =>
  workspaceStore.agents.filter((agent) => agent.status !== 'disabled'),
);
const completedRunCount = computed(
  () =>
    evaluationStore.latestRuns.filter((run) => run.status === 'completed')
      .length,
);
const averageLatestScore = computed(() => {
  if (evaluationStore.latestRuns.length === 0) {
    return 0;
  }

  const total = evaluationStore.latestRuns.reduce(
    (sum, run) => sum + run.score,
    0,
  );

  return total / evaluationStore.latestRuns.length;
});

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: '通过',
    failed: '未通过',
    ready: '启用',
  };

  return labels[status] ?? status;
}

function agentName(agentId: string): string {
  return workspaceStore.agentName(agentId);
}

function openCreateModal(): void {
  createModalOpen.value = true;
}

async function submitSuite(
  input: Parameters<typeof evaluationStore.createSuite>[0],
): Promise<void> {
  try {
    await evaluationStore.createSuite(input);
    createModalOpen.value = false;
  } catch {
    return;
  }
}

async function selectSuite(suiteId: string): Promise<void> {
  selectedSuiteId.value = suiteId;
  await evaluationStore.loadRuns(suiteId);
}

async function runSuite(suiteId: string): Promise<void> {
  selectedSuiteId.value = suiteId;
  await evaluationStore.runSuite(suiteId);
}

onMounted(async () => {
  await Promise.all([
    workspaceStore.initialize(),
    evaluationStore.initialize(),
  ]);

  if (evaluationStore.suites[0]) {
    await selectSuite(evaluationStore.suites[0].id);
  }
});
</script>

<template>
  <div class="admin-page evaluation-page">
    <section class="evaluation-hero">
      <div>
        <span class="section-kicker">Evaluation</span>
        <h2>评估与测试</h2>
        <p>通过可复用评估集、测试用例和基准运行，持续跟踪智能体回答质量。</p>
      </div>
      <div class="evaluation-actions">
        <button
          class="secondary-button"
          type="button"
          :disabled="evaluationStore.isLoading"
          @click="evaluationStore.initialize"
        >
          <BaseIcon name="refresh" />
          {{ evaluationStore.isLoading ? '刷新中…' : '刷新数据' }}
        </button>
        <button
          class="primary-button"
          type="button"
          :disabled="!availableAgents.length"
          @click="openCreateModal"
        >
          <BaseIcon name="plus" />
          新建评估集
        </button>
      </div>
    </section>

    <p v-if="evaluationStore.errorMessage" class="form-error">
      {{ evaluationStore.errorMessage }}
    </p>

    <section class="evaluation-metrics">
      <article>
        <span>评估集</span>
        <strong>{{ evaluationStore.suites.length }}</strong>
        <small>已定义的基准测试集合</small>
      </article>
      <article>
        <span>最近通过</span>
        <strong>{{ completedRunCount }}</strong>
        <small>最新运行状态为通过</small>
      </article>
      <article>
        <span>平均得分</span>
        <strong>{{ formatPercent(averageLatestScore) }}</strong>
        <small>按最新运行粗略衡量</small>
      </article>
    </section>

    <section
      v-if="evaluationStore.isLoading && !evaluationStore.suites.length"
      class="empty-state"
    >
      <BaseIcon name="refresh" />
      <h2>正在加载评估数据</h2>
      <p>正在获取评估集和最近运行结果。</p>
    </section>

    <section
      v-else-if="evaluationStore.suites.length"
      class="evaluation-layout"
    >
      <div class="evaluation-suite-list">
        <article
          v-for="suite in evaluationStore.suites"
          :key="suite.id"
          class="resource-card evaluation-suite-card"
          :class="{ 'is-selected': suite.id === selectedSuiteId }"
        >
          <header class="resource-card__header">
            <span class="resource-avatar">
              <BaseIcon name="check" />
            </span>
            <span class="status-badge" :class="`status-badge--${suite.status}`">
              {{ statusLabel(suite.status) }}
            </span>
          </header>
          <div class="resource-card__body">
            <h2>{{ suite.name }}</h2>
            <p>{{ suite.description }}</p>
            <dl class="agent-card__meta">
              <div>
                <dt>智能体</dt>
                <dd>{{ agentName(suite.agentId) }}</dd>
              </div>
              <div>
                <dt>用例</dt>
                <dd>{{ suite.caseCount }} 个</dd>
              </div>
              <div>
                <dt>指标</dt>
                <dd>{{ suite.metricCount }} 个</dd>
              </div>
              <div>
                <dt>最新得分</dt>
                <dd>
                  {{
                    suite.latestRun
                      ? formatPercent(suite.latestRun.score)
                      : '暂无'
                  }}
                </dd>
              </div>
            </dl>
          </div>
          <footer class="resource-card__footer">
            <span>更新于 {{ formatDate(suite.updatedAt) }}</span>
            <div class="resource-card__footer-actions">
              <button
                class="secondary-button secondary-button--small"
                type="button"
                @click="selectSuite(suite.id)"
              >
                查看运行
              </button>
              <button
                class="primary-button primary-button--small"
                type="button"
                :disabled="evaluationStore.isSaving"
                @click="runSuite(suite.id)"
              >
                <BaseIcon name="activity" />
                运行评估
              </button>
            </div>
          </footer>
        </article>
      </div>

      <aside class="evaluation-runs panel-card">
        <header>
          <div>
            <span class="section-kicker">Benchmark Runs</span>
            <h3>{{ selectedSuite?.name ?? '运行记录' }}</h3>
          </div>
          <button
            v-if="selectedSuiteId"
            class="secondary-button secondary-button--small"
            type="button"
            :disabled="evaluationStore.isSaving"
            @click="selectSuite(selectedSuiteId)"
          >
            刷新
          </button>
        </header>

        <div v-if="selectedSuiteRuns.length" class="evaluation-run-list">
          <button
            v-for="run in selectedSuiteRuns"
            :key="run.id"
            type="button"
            class="evaluation-run-item"
            @click="evaluationStore.openRun(run.id)"
          >
            <span>
              <strong>{{ formatPercent(run.score) }}</strong>
              <small>{{ formatDate(run.startedAt) }}</small>
            </span>
            <span class="status-badge" :class="`status-badge--${run.status}`">
              {{ statusLabel(run.status) }}
            </span>
          </button>
        </div>

        <div v-else class="empty-state evaluation-empty">
          <BaseIcon name="clock" />
          <h2>暂无运行记录</h2>
          <p>选择评估集并点击“运行评估”生成基准结果。</p>
        </div>
      </aside>
    </section>

    <section v-else-if="!evaluationStore.isLoading" class="empty-state">
      <BaseIcon name="check" />
      <h2>还没有评估集</h2>
      <p>先选择一个智能体，定义问题与期望关键词，即可建立持续评估基准。</p>
      <button
        class="primary-button"
        type="button"
        :disabled="!availableAgents.length"
        @click="openCreateModal"
      >
        创建第一个评估集
      </button>
    </section>

    <BaseModal
      :open="createModalOpen"
      title="新建评估集"
      description="用例会按当前智能体配置调用真实模型，并以关键词命中率自动评分。"
      @close="createModalOpen = false"
    >
      <EvaluationSuiteForm
        v-if="createModalOpen"
        :agents="availableAgents"
        :is-saving="evaluationStore.isSaving"
        @cancel="createModalOpen = false"
        @submit="submitSuite"
      />
    </BaseModal>

    <BaseModal
      :open="Boolean(evaluationStore.selectedRun)"
      title="评估运行详情"
      description="展示每个测试用例的回答、得分、命中和缺失关键词。"
      @close="evaluationStore.selectedRun = undefined"
    >
      <EvaluationRunDetail
        v-if="evaluationStore.selectedRun"
        :run="evaluationStore.selectedRun"
      />
    </BaseModal>
  </div>
</template>
