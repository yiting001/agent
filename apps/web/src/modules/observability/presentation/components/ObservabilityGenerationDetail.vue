<script setup lang="ts">
import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';

import type {
  ObservabilityGenerationDetail,
  ObservabilityGenerationFeedback,
} from '../../domain/observability-dashboard';
import { formatDateTime } from '../observability-display';

defineProps<{
  generation: ObservabilityGenerationDetail;
}>();

const reasonLabels: Record<
  ObservabilityGenerationFeedback['reasonCodes'][number],
  string
> = {
  citation: '引用错误',
  format: '格式不符合',
  incorrect: '事实错误',
  irrelevant: '内容不相关',
  model: '模型或路由异常',
  other: '其他',
};

function statusLabel(status: ObservabilityGenerationDetail['status']): string {
  return {
    cancelled: '已取消',
    completed: '已完成',
    error: '异常',
    running: '生成中',
  }[status];
}
</script>

<template>
  <article class="observability-generation">
    <header class="observability-generation__header">
      <div>
        <span class="section-kicker">Generation</span>
        <h3>{{ generation.providerName }} · {{ generation.requestedModel }}</h3>
        <p>
          {{ formatDateTime(generation.startedAt) }} ·
          {{ statusLabel(generation.status) }}
        </p>
      </div>
      <div class="observability-generation__badges">
        <span>{{ generation.captureMode }}</span>
        <span v-if="generation.truncated">内容已截断</span>
      </div>
    </header>

    <dl class="observability-generation__identity">
      <div>
        <dt>请求模型</dt>
        <dd>{{ generation.requestedModel }}</dd>
      </div>
      <div>
        <dt>响应模型</dt>
        <dd>{{ generation.responseModel ?? '上游未返回' }}</dd>
      </div>
      <div>
        <dt>供应商</dt>
        <dd>{{ generation.providerName }} / {{ generation.providerId }}</dd>
      </div>
      <div>
        <dt>响应 ID</dt>
        <dd>{{ generation.upstreamResponseId ?? '上游未返回' }}</dd>
      </div>
      <div>
        <dt>结束原因</dt>
        <dd>{{ generation.finishReasons.join('、') || '上游未返回' }}</dd>
      </div>
      <div>
        <dt>Generation ID</dt>
        <dd>{{ generation.id }}</dd>
      </div>
    </dl>

    <section class="observability-generation__content">
      <header>
        <h4>脱敏模型输入</h4>
        <small v-if="generation.captureMode === 'off'">内容采集已关闭</small>
      </header>
      <div v-if="generation.inputMessages.length">
        <details
          v-for="(message, index) in generation.inputMessages"
          :key="`${message.role}-${index}`"
          :open="message.role !== 'system'"
        >
          <summary>{{ message.role }}</summary>
          <pre>{{ message.content || '（空内容）' }}</pre>
        </details>
      </div>
      <p v-else class="observability-generation__empty">没有已保留的输入。</p>
    </section>

    <section class="observability-generation__content">
      <header>
        <h4>脱敏模型输出</h4>
      </header>
      <pre v-if="generation.outputText">{{ generation.outputText }}</pre>
      <p v-else class="observability-generation__empty">没有已保留的输出。</p>
    </section>

    <section class="observability-generation__feedback">
      <header>
        <h4>质量反馈</h4>
        <span>{{ generation.feedback.length }} 条</span>
      </header>
      <div
        v-for="feedback in generation.feedback"
        :key="feedback.id"
        class="observability-generation__feedback-item"
      >
        <BaseIcon
          :name="feedback.rating === 'positive' ? 'activity' : 'alert'"
        />
        <div>
          <strong>{{
            feedback.rating === 'positive' ? '正向反馈' : '负向反馈'
          }}</strong>
          <small>
            {{
              feedback.reasonCodes.map((item) => reasonLabels[item]).join('、')
            }}
          </small>
          <p v-if="feedback.comment">{{ feedback.comment }}</p>
        </div>
        <time>{{ formatDateTime(feedback.updatedAt) }}</time>
      </div>
      <p
        v-if="generation.feedback.length === 0"
        class="observability-generation__empty"
      >
        暂无用户反馈。
      </p>
    </section>
  </article>
</template>
