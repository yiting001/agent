<script setup lang="ts">
import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';

import type { ObservabilityTracePage } from '../../domain/observability-dashboard';
import {
  formatCost,
  formatDateTime,
  formatDuration,
  formatNumber,
} from '../observability-display';

defineProps<{
  isLoading: boolean;
  tracePage: ObservabilityTracePage;
}>();

const emit = defineEmits<{
  pageChange: [page: number];
  selectTrace: [traceId: string];
}>();

function shortTraceId(traceId: string): string {
  return `${traceId.slice(0, 8)}…${traceId.slice(-4)}`;
}

function statusLabel(status: 'cancelled' | 'error' | 'ok'): string {
  return status === 'ok' ? '成功' : status === 'cancelled' ? '已取消' : '异常';
}

function selectTrace(traceId: string): void {
  emit('selectTrace', traceId);
}
</script>

<template>
  <section class="panel-card observability-traces">
    <header class="panel-card__header">
      <div>
        <h2>最近执行链路</h2>
        <p>一次请求关联 HTTP、模型和工具步骤，正文不会写入日志。</p>
      </div>
      <span v-if="isLoading" class="observability-traces__loading">加载中</span>
    </header>

    <div v-if="tracePage.items.length" class="observability-table">
      <div class="observability-table__head">
        <span>链路 / 操作</span>
        <span>状态</span>
        <span>耗时</span>
        <span>Token</span>
        <span>成本</span>
        <span>时间</span>
        <span aria-hidden="true"></span>
      </div>
      <button
        v-for="trace in tracePage.items"
        :key="trace.traceId"
        class="observability-table__row observability-table__row--button"
        type="button"
        :aria-label="`查看 ${trace.operation} 的完整调用链`"
        @click="selectTrace(trace.traceId)"
      >
        <span>
          <strong>{{ shortTraceId(trace.traceId) }}</strong>
          <small>{{ trace.operation }} · {{ trace.spanCount }} 个 Span</small>
        </span>
        <span class="status-badge" :class="`status-badge--${trace.status}`">
          {{ statusLabel(trace.status) }}
        </span>
        <span>{{ formatDuration(trace.durationMs) }}</span>
        <span
          >{{ formatNumber(trace.inputTokens) }} /
          {{ formatNumber(trace.outputTokens) }}</span
        >
        <span>{{ formatCost(trace.costUsd) }}</span>
        <span>{{ formatDateTime(trace.startedAt) }}</span>
        <span class="observability-table__action">
          <BaseIcon name="chevron" />
        </span>
      </button>
    </div>
    <div v-else class="empty-state empty-state--compact">
      <p>
        {{
          isLoading ? '正在读取执行链路。' : '当前时间窗口内还没有执行链路。'
        }}
      </p>
    </div>

    <footer v-if="tracePage.totalPages > 0" class="observability-pagination">
      <span>
        共 {{ formatNumber(tracePage.total) }} 条，每页
        {{ tracePage.pageSize }} 条
      </span>
      <div class="observability-pagination__controls">
        <button
          class="icon-button"
          type="button"
          aria-label="上一页"
          :disabled="isLoading || tracePage.page <= 1"
          @click="emit('pageChange', tracePage.page - 1)"
        >
          <BaseIcon class="observability-pagination__previous" name="chevron" />
        </button>
        <span class="observability-pagination__indicator">
          第 {{ tracePage.page }} / {{ tracePage.totalPages }} 页
        </span>
        <button
          class="icon-button"
          type="button"
          aria-label="下一页"
          :disabled="isLoading || tracePage.page >= tracePage.totalPages"
          @click="emit('pageChange', tracePage.page + 1)"
        >
          <BaseIcon name="chevron" />
        </button>
      </div>
    </footer>
  </section>
</template>
