<script setup lang="ts">
import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';

import type { ObservabilityDashboard } from '../../domain/observability-dashboard';
import { formatDateTime } from '../observability-display';

defineProps<{
  alerts: ObservabilityDashboard['alerts'];
}>();
</script>

<template>
  <section class="panel-card observability-alerts">
    <header class="panel-card__header">
      <div>
        <h2>异常告警</h2>
        <p>失败、慢请求、慢模型调用和单次高成本会自动触发。</p>
      </div>
    </header>
    <div v-if="alerts.length" class="observability-alert-list">
      <article
        v-for="alert in alerts"
        :key="`${alert.traceId}-${alert.occurredAt}`"
        :class="`is-${alert.severity}`"
      >
        <span><BaseIcon name="alert" /></span>
        <div>
          <strong>{{ alert.message }}</strong>
          <p>{{ alert.operation }} · {{ formatDateTime(alert.occurredAt) }}</p>
          <small>Trace {{ alert.traceId }}</small>
        </div>
      </article>
    </div>
    <div v-else class="observability-all-clear">
      <BaseIcon name="check" />
      <div>
        <strong>当前没有异常告警</strong>
        <p>系统会继续监控错误、延迟和成本阈值。</p>
      </div>
    </div>
  </section>
</template>
