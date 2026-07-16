<script setup lang="ts">
import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';

import type { ObservabilityDashboard } from '../../domain/observability-dashboard';
import {
  formatBytes,
  formatCost,
  formatDuration,
  formatNumber,
} from '../observability-display';

defineProps<{
  dashboard: ObservabilityDashboard;
}>();
</script>

<template>
  <section class="observability-metrics" aria-label="可观测性核心指标">
    <article>
      <span><BaseIcon name="activity" /></span>
      <div>
        <p>请求流量</p>
        <strong>{{
          formatNumber(dashboard.goldenSignals.requestCount)
        }}</strong>
        <small>{{ dashboard.windowHours }} 小时累计请求</small>
      </div>
    </article>
    <article>
      <span><BaseIcon name="clock" /></span>
      <div>
        <p>P95 延迟</p>
        <strong>{{
          formatDuration(dashboard.goldenSignals.p95LatencyMs)
        }}</strong>
        <small
          >平均
          {{ formatDuration(dashboard.goldenSignals.averageLatencyMs) }}</small
        >
      </div>
    </article>
    <article>
      <span><BaseIcon name="alert" /></span>
      <div>
        <p>错误率</p>
        <strong>{{ dashboard.goldenSignals.errorRate.toFixed(2) }}%</strong>
        <small>{{ dashboard.alerts.length }} 条活跃告警</small>
      </div>
    </article>
    <article>
      <span><BaseIcon name="memory" /></span>
      <div>
        <p>堆内存饱和度</p>
        <strong>{{ dashboard.runtime.heapUtilization.toFixed(1) }}%</strong>
        <small
          >{{ formatBytes(dashboard.runtime.heapUsedBytes) }} /
          {{ formatBytes(dashboard.runtime.heapTotalBytes) }}</small
        >
      </div>
    </article>
    <article>
      <span><BaseIcon name="model" /></span>
      <div>
        <p>模型调用</p>
        <strong>{{
          formatNumber(dashboard.goldenSignals.modelCallCount)
        }}</strong>
        <small
          >{{ formatNumber(dashboard.usage.inputTokens) }} 输入 Token</small
        >
      </div>
    </article>
    <article>
      <span><BaseIcon name="cost" /></span>
      <div>
        <p>估算成本</p>
        <strong>{{ formatCost(dashboard.usage.estimatedCostUsd) }}</strong>
        <small
          >{{ dashboard.usage.pricedModelCallCount }} 次调用已配置单价</small
        >
      </div>
    </article>
    <article>
      <span><BaseIcon name="activity" /></span>
      <div>
        <p>用户反馈</p>
        <strong>{{ formatNumber(dashboard.quality.feedbackCount) }}</strong>
        <small
          >{{
            formatNumber(dashboard.quality.negativeFeedbackCount)
          }}
          条负向反馈</small
        >
      </div>
    </article>
    <article>
      <span><BaseIcon name="model" /></span>
      <div>
        <p>正反馈率</p>
        <strong
          >{{ dashboard.quality.positiveFeedbackRate.toFixed(2) }}%</strong
        >
        <small>基于当前时间窗口反馈</small>
      </div>
    </article>
    <article>
      <span><BaseIcon name="alert" /></span>
      <div>
        <p>模型不一致</p>
        <strong>{{
          formatNumber(dashboard.quality.modelMismatchCount)
        }}</strong>
        <small>请求模型与上游响应模型不同</small>
      </div>
    </article>
  </section>
</template>
