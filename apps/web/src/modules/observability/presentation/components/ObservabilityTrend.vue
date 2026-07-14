<script setup lang="ts">
import { computed } from 'vue';

import type { ObservabilityDashboard } from '../../domain/observability-dashboard';
import { formatCost, formatDateTime } from '../observability-display';

const props = defineProps<{
  series: ObservabilityDashboard['series'];
}>();

const maximum = computed(() =>
  Math.max(
    1,
    ...props.series.map((point) =>
      Math.max(point.requestCount, point.modelCallCount),
    ),
  ),
);
</script>

<template>
  <section class="panel-card observability-trend">
    <header class="panel-card__header">
      <div>
        <h2>运行趋势</h2>
        <p>请求、错误、模型调用与成本按时间窗口聚合。</p>
      </div>
      <span class="observability-legend">
        <i class="is-request"></i>请求 <i class="is-model"></i>模型
        <i class="is-error"></i>错误
      </span>
    </header>
    <div class="observability-chart">
      <div
        v-for="point in series"
        :key="point.startedAt"
        class="observability-chart__column"
        :title="`${formatDateTime(point.startedAt)} · 请求 ${point.requestCount} · 模型 ${point.modelCallCount} · 错误 ${point.errorCount} · ${formatCost(point.costUsd)}`"
      >
        <span
          class="observability-chart__bar is-request"
          :style="{ height: `${(point.requestCount / maximum) * 100}%` }"
        ></span>
        <span
          class="observability-chart__bar is-model"
          :style="{ height: `${(point.modelCallCount / maximum) * 100}%` }"
        ></span>
        <span
          v-if="point.errorCount"
          class="observability-chart__error"
          :aria-label="`${point.errorCount} 个错误`"
        ></span>
      </div>
    </div>
  </section>
</template>
