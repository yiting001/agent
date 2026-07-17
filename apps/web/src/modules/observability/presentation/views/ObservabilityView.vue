<script setup lang="ts">
import { computed, onMounted } from 'vue';

import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';
import ManagementAccessPanel from '@/modules/management-access/presentation/components/ManagementAccessPanel.vue';
import type { ManagementScope } from '@/modules/management-access/domain/management-access';
import { useManagementAccessStore } from '@/modules/management-access/stores/management-access.store';

import ObservabilityAlerts from '../components/ObservabilityAlerts.vue';
import ObservabilityFeedbackConversionModal from '../components/ObservabilityFeedbackConversionModal.vue';
import ObservabilityFeedbackReviewQueue from '../components/ObservabilityFeedbackReviewQueue.vue';
import ObservabilityMetricGrid from '../components/ObservabilityMetricGrid.vue';
import ObservabilityTraceDetailModal from '../components/ObservabilityTraceDetailModal.vue';
import ObservabilityTraceTable from '../components/ObservabilityTraceTable.vue';
import ObservabilityTrend from '../components/ObservabilityTrend.vue';
import { useObservabilityStore } from '../../stores/observability.store';

const accessStore = useManagementAccessStore();
const store = useObservabilityStore();
const observableScopes: ManagementScope[] = [
  'observability:metrics',
  'observability:feedback',
];
const canViewMetrics = computed(() =>
  accessStore.hasScope('observability:metrics'),
);
const canReviewFeedback = computed(() =>
  accessStore.hasScope('observability:feedback'),
);
const canAccessObservability = computed(
  () => canViewMetrics.value || canReviewFeedback.value,
);
const canConvertFeedback = computed(() =>
  accessStore.hasScopes(['observability:feedback', 'evaluation:manage']),
);
const windows = [
  { hours: 1, label: '最近 1 小时' },
  { hours: 24, label: '最近 24 小时' },
  { hours: 168, label: '最近 7 天' },
];

async function loadPage(): Promise<void> {
  const requests: Promise<void>[] = [];

  if (canViewMetrics.value) {
    requests.push(store.refresh());
  }

  if (canReviewFeedback.value) {
    requests.push(store.loadFeedbackReviews());
  }

  await Promise.all(requests);
}

async function loadAuthenticatedPage(): Promise<void> {
  store.reset();
  await loadPage();
}

async function restoreSession(): Promise<void> {
  if ((await accessStore.validateSession()) && canAccessObservability.value) {
    await loadAuthenticatedPage();
  }
}

function logout(): void {
  store.reset();
}

function retryTrace(): void {
  if (store.selectedTraceId) {
    void store.openTrace(store.selectedTraceId);
  }
}

onMounted(restoreSession);
</script>

<template>
  <div class="admin-page observability-page">
    <section class="observability-header">
      <div>
        <span class="section-kicker">Observability</span>
        <h2>观测与监控</h2>
        <p>统一查看调用链、真实响应模型、脱敏输入输出、用户反馈与质量指标。</p>
      </div>
      <div v-if="canViewMetrics" class="observability-actions">
        <div class="observability-window" aria-label="监控时间窗口">
          <button
            v-for="window in windows"
            :key="window.hours"
            type="button"
            :class="{ 'is-active': store.windowHours === window.hours }"
            @click="store.refresh(window.hours)"
          >
            {{ window.label }}
          </button>
        </div>
        <button
          class="secondary-button"
          type="button"
          :disabled="store.isLoading"
          @click="store.refresh()"
        >
          <BaseIcon name="refresh" />
          {{ store.isLoading ? '刷新中…' : '刷新数据' }}
        </button>
      </div>
    </section>

    <ManagementAccessPanel
      permission-message="当前管理凭证缺少观测指标或反馈审核权限。"
      :required-any-scopes="observableScopes"
      @authenticated="loadAuthenticatedPage"
      @logged-out="logout"
    />

    <template v-if="canViewMetrics">
      <p v-if="store.errorMessage" class="form-error" role="alert">
        {{ store.errorMessage }}
      </p>

      <template v-if="store.dashboard">
        <ObservabilityMetricGrid :dashboard="store.dashboard" />
        <div class="observability-layout">
          <ObservabilityTrend :series="store.dashboard.series" />
          <ObservabilityAlerts :alerts="store.dashboard.alerts" />
        </div>
        <ObservabilityTraceTable
          :is-loading="store.isTraceListLoading"
          :trace-page="store.tracePage"
          @page-change="store.goToTracePage"
          @select-trace="store.openTrace"
        />
      </template>

      <section v-else-if="store.isLoading" class="panel-card empty-state">
        <BaseIcon name="activity" />
        <h2>正在汇总监控数据</h2>
        <p>正在读取请求、模型和工具执行事件。</p>
      </section>

      <ObservabilityTraceDetailModal
        :error-message="store.traceDetailErrorMessage"
        :loading="store.isTraceDetailLoading"
        :open="Boolean(store.selectedTraceId)"
        :trace="store.selectedTrace"
        :trace-id="store.selectedTraceId"
        @close="store.closeTrace"
        @retry="retryTrace"
      />
    </template>

    <ObservabilityFeedbackReviewQueue
      v-if="canReviewFeedback"
      :can-convert="canConvertFeedback"
    />

    <ObservabilityFeedbackConversionModal
      v-if="canConvertFeedback"
      :error-message="store.conversionErrorMessage"
      :is-loading="store.isPreparingConversion"
      :is-saving="store.isConvertingFeedback"
      :review="store.selectedFeedbackReview"
      :suites="store.conversionSuites"
      @cancel="store.closeFeedbackReviewConversion"
      @retry-suites="store.loadConversionSuites"
      @submit="store.convertFeedbackReview"
    />
  </div>
</template>
