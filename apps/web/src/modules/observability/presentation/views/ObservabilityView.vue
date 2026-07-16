<script setup lang="ts">
import { onMounted } from 'vue';

import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';

import ObservabilityAlerts from '../components/ObservabilityAlerts.vue';
import ObservabilityMetricGrid from '../components/ObservabilityMetricGrid.vue';
import ObservabilityTraceTable from '../components/ObservabilityTraceTable.vue';
import ObservabilityTraceDetailModal from '../components/ObservabilityTraceDetailModal.vue';
import ObservabilityTrend from '../components/ObservabilityTrend.vue';
import { useObservabilityStore } from '../../stores/observability.store';

const store = useObservabilityStore();
const windows = [
  { hours: 1, label: '最近 1 小时' },
  { hours: 24, label: '最近 24 小时' },
  { hours: 168, label: '最近 7 天' },
];

onMounted(() => store.refresh());
</script>

<template>
  <div class="admin-page observability-page">
    <section class="observability-header">
      <div>
        <span class="section-kicker">Observability</span>
        <h2>观测与监控</h2>
        <p>统一查看日志链路、黄金指标、模型 Token、估算成本与异常告警。</p>
      </div>
      <div class="observability-actions">
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

    <p v-if="store.errorMessage" class="form-error">
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
    />
  </div>
</template>
