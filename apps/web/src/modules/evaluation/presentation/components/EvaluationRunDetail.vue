<script setup lang="ts">
import type { EvaluationRunDetail } from '../../domain/evaluation';

defineProps<{
  run: EvaluationRunDetail;
}>();

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function statusLabel(status: string): string {
  return status === 'completed' || status === 'passed' ? '通过' : '未通过';
}
</script>

<template>
  <div class="evaluation-run-detail">
    <header>
      <strong>{{ formatPercent(run.score) }}</strong>
      <span class="status-badge" :class="`status-badge--${run.status}`">
        {{ statusLabel(run.status) }}
      </span>
    </header>
    <article
      v-for="result in run.results"
      :key="result.id"
      class="evaluation-result-card"
    >
      <div>
        <strong>{{ formatPercent(result.score) }}</strong>
        <span class="status-badge" :class="`status-badge--${result.status}`">
          {{ statusLabel(result.status) }}
        </span>
      </div>
      <dl>
        <div>
          <dt>测试输入</dt>
          <dd>{{ result.input }}</dd>
        </div>
        <div>
          <dt>智能体回答</dt>
          <dd>{{ result.answer || result.errorMessage }}</dd>
        </div>
      </dl>
      <dl>
        <div>
          <dt>命中关键词</dt>
          <dd>{{ result.matchedKeywords.join('、') || '无' }}</dd>
        </div>
        <div>
          <dt>缺失关键词</dt>
          <dd>{{ result.missingKeywords.join('、') || '无' }}</dd>
        </div>
      </dl>
    </article>
  </div>
</template>
