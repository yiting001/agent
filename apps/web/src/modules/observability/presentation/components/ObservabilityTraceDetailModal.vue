<script setup lang="ts">
import { computed } from 'vue';

import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';
import BaseModal from '@/modules/admin/presentation/components/BaseModal.vue';

import ObservabilityGenerationDetail from './ObservabilityGenerationDetail.vue';
import type {
  ObservabilityCategory,
  ObservabilityTraceDetail,
  ObservabilityTraceSpan,
} from '../../domain/observability-dashboard';
import {
  formatCost,
  formatDateTime,
  formatDuration,
  formatNumber,
} from '../observability-display';

const props = defineProps<{
  errorMessage: string;
  loading: boolean;
  open: boolean;
  trace?: ObservabilityTraceDetail;
  traceId?: string;
}>();

const emit = defineEmits<{
  close: [];
  retry: [];
}>();

const categoryLabels: Record<ObservabilityCategory, string> = {
  http: 'HTTP 请求',
  model: '模型调用',
  tool: '工具执行',
};

const displaySpans = computed(() => {
  if (!props.trace) {
    return [];
  }

  const spanMap = new Map(props.trace.spans.map((span) => [span.spanId, span]));

  return props.trace.spans.map((span) => ({
    ...span,
    depth: spanDepth(span, spanMap),
    relativeStartMs: Math.max(
      0,
      new Date(span.startedAt).getTime() -
        new Date(props.trace?.startedAt ?? span.startedAt).getTime(),
    ),
  }));
});

function spanDepth(
  span: ObservabilityTraceSpan,
  spanMap: Map<string, ObservabilityTraceSpan>,
  visited = new Set<string>(),
): number {
  if (!span.parentSpanId || visited.has(span.spanId)) {
    return 0;
  }

  const parent = spanMap.get(span.parentSpanId);

  if (!parent) {
    return 0;
  }

  visited.add(span.spanId);

  return Math.min(4, 1 + spanDepth(parent, spanMap, visited));
}

function categoryIcon(
  category: ObservabilityCategory,
): 'api' | 'model' | 'skill' {
  return category === 'http' ? 'api' : category === 'model' ? 'model' : 'skill';
}

function statusLabel(status: 'cancelled' | 'error' | 'ok'): string {
  return status === 'ok' ? '成功' : status === 'cancelled' ? '已取消' : '异常';
}

function tokenSourceLabel(
  source: ObservabilityTraceSpan['tokenCountSource'],
): string {
  return source === 'actual'
    ? '实际'
    : source === 'estimated'
      ? '估算'
      : '不可用';
}

function formatOffset(milliseconds: number): string {
  return milliseconds < 1_000
    ? `+${milliseconds.toFixed(0)} ms`
    : `+${(milliseconds / 1_000).toFixed(2)} s`;
}

function shortId(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function formatMetadataValue(value: string | number | boolean): string {
  return typeof value === 'string' ? value : String(value);
}
</script>

<template>
  <BaseModal
    flush
    :open="open"
    title="调用链详情"
    :description="trace ? `Trace ${trace.traceId}` : `Trace ${traceId ?? ''}`"
    wide
    @close="emit('close')"
  >
    <div v-if="loading" class="observability-trace-detail__state">
      <BaseIcon name="activity" />
      <strong>正在读取调用链</strong>
    </div>
    <div
      v-else-if="errorMessage"
      class="observability-trace-detail__state is-error"
    >
      <BaseIcon name="alert" />
      <strong>{{ errorMessage }}</strong>
      <button
        class="secondary-button secondary-button--small"
        type="button"
        @click="emit('retry')"
      >
        重试
      </button>
    </div>
    <div v-else-if="trace" class="observability-trace-detail">
      <div class="observability-trace-summary">
        <span>
          <small>根操作</small>
          <strong>{{ trace.operation }}</strong>
        </span>
        <span>
          <small>状态</small>
          <strong
            class="status-badge"
            :class="`status-badge--${trace.status}`"
            >{{ statusLabel(trace.status) }}</strong
          >
        </span>
        <span>
          <small>总耗时</small>
          <strong>{{ formatDuration(trace.durationMs) }}</strong>
        </span>
        <span>
          <small>Span</small>
          <strong>{{ trace.spanCount }}</strong>
        </span>
        <span>
          <small>Token</small>
          <strong
            >{{ formatNumber(trace.inputTokens) }} /
            {{ formatNumber(trace.outputTokens) }}</strong
          >
        </span>
        <span>
          <small>成本</small>
          <strong>{{ formatCost(trace.costUsd) }}</strong>
        </span>
      </div>

      <section
        v-if="trace.generations.length"
        class="observability-generation-list"
      >
        <ObservabilityGenerationDetail
          v-for="generation in trace.generations"
          :key="generation.id"
          :generation="generation"
        />
      </section>

      <section class="observability-trace-chain">
        <header class="observability-trace-chain__header">
          <div>
            <h3>完整调用链</h3>
            <p>{{ formatDateTime(trace.startedAt) }}</p>
          </div>
          <span>{{ trace.spanCount }} 个 Span</span>
        </header>

        <ol class="observability-trace-chain__list">
          <li
            v-for="span in displaySpans"
            :key="span.spanId"
            class="observability-trace-span"
            :style="{ '--trace-depth': span.depth }"
          >
            <div
              class="observability-trace-span__marker"
              :class="`observability-trace-span__marker--${span.category}`"
            >
              <BaseIcon :name="categoryIcon(span.category)" />
            </div>
            <div class="observability-trace-span__body">
              <div class="observability-trace-span__heading">
                <div>
                  <strong>{{ span.operation }}</strong>
                  <small
                    >{{ categoryLabels[span.category] }} ·
                    {{ formatOffset(span.relativeStartMs) }} ·
                    {{ formatDateTime(span.startedAt) }}</small
                  >
                </div>
                <span
                  class="status-badge"
                  :class="`status-badge--${span.status}`"
                  >{{ statusLabel(span.status) }}</span
                >
              </div>

              <div class="observability-trace-span__metrics">
                <span
                  ><BaseIcon name="clock" />{{
                    formatDuration(span.durationMs)
                  }}</span
                >
                <span
                  >Token {{ formatNumber(span.inputTokens) }} /
                  {{ formatNumber(span.outputTokens) }} ·
                  {{ tokenSourceLabel(span.tokenCountSource) }}</span
                >
                <span>{{ formatCost(span.costUsd) }}</span>
              </div>

              <div
                v-if="
                  span.method ||
                  span.route ||
                  span.statusCode ||
                  span.model ||
                  span.providerId ||
                  span.requestedModel ||
                  span.responseModel
                "
                class="observability-trace-span__context"
              >
                <span v-if="span.method || span.route || span.statusCode">
                  <strong>请求</strong>
                  {{ span.method }} {{ span.route }}
                  <em v-if="span.statusCode">HTTP {{ span.statusCode }}</em>
                </span>
                <span
                  v-if="
                    span.model ||
                    span.providerId ||
                    span.requestedModel ||
                    span.responseModel
                  "
                >
                  <strong>模型</strong>
                  {{ span.providerName ?? span.providerId ?? '未指定服务' }}
                  <em>
                    {{ span.requestedModel ?? span.model ?? '未知请求模型' }}
                    →
                    {{ span.responseModel ?? '上游未返回' }}
                  </em>
                </span>
              </div>

              <div
                v-if="Object.keys(span.metadata).length"
                class="observability-trace-span__metadata"
              >
                <span v-for="(value, key) in span.metadata" :key="key">
                  <strong>{{ key }}</strong>
                  {{ formatMetadataValue(value) }}
                </span>
              </div>

              <p
                v-if="span.errorMessage"
                class="observability-trace-span__error"
              >
                {{ span.errorMessage }}
              </p>
              <code
                >Span {{ shortId(span.spanId)
                }}<span v-if="span.parentSpanId">
                  · parent {{ shortId(span.parentSpanId) }}</span
                ></code
              >
            </div>
          </li>
        </ol>
      </section>
    </div>
  </BaseModal>
</template>
