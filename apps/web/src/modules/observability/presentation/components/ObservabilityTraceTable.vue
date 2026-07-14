<script setup lang="ts">
import type { ObservabilityDashboard } from '../../domain/observability-dashboard';
import {
  formatCost,
  formatDateTime,
  formatDuration,
  formatNumber,
} from '../observability-display';

defineProps<{
  traces: ObservabilityDashboard['recentTraces'];
}>();

function shortTraceId(traceId: string): string {
  return `${traceId.slice(0, 8)}…${traceId.slice(-4)}`;
}
</script>

<template>
  <section class="panel-card observability-traces">
    <header class="panel-card__header">
      <div>
        <h2>最近执行链路</h2>
        <p>一次请求关联 HTTP、模型和工具步骤，正文不会写入日志。</p>
      </div>
    </header>
    <div v-if="traces.length" class="observability-table">
      <div class="observability-table__head">
        <span>链路 / 操作</span>
        <span>状态</span>
        <span>耗时</span>
        <span>Token</span>
        <span>成本</span>
        <span>时间</span>
      </div>
      <div
        v-for="trace in traces"
        :key="trace.traceId"
        class="observability-table__row"
      >
        <span>
          <strong>{{ shortTraceId(trace.traceId) }}</strong>
          <small>{{ trace.operation }} · {{ trace.spanCount }} 个 Span</small>
        </span>
        <span class="status-badge" :class="`status-badge--${trace.status}`">
          {{
            trace.status === 'ok'
              ? '成功'
              : trace.status === 'cancelled'
                ? '已取消'
                : '异常'
          }}
        </span>
        <span>{{ formatDuration(trace.durationMs) }}</span>
        <span
          >{{ formatNumber(trace.inputTokens) }} /
          {{ formatNumber(trace.outputTokens) }}</span
        >
        <span>{{ formatCost(trace.costUsd) }}</span>
        <span>{{ formatDateTime(trace.startedAt) }}</span>
      </div>
    </div>
    <div v-else class="empty-state empty-state--compact">
      <p>当前时间窗口内还没有执行链路。</p>
    </div>
  </section>
</template>
