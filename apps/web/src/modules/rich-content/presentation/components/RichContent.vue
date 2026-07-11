<script setup lang="ts">
import { computed } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

import { splitContentSegments } from '../../domain/content-segment';
import { renderMarkdownToHtml } from '../../infrastructure/markdown/markdown-renderer';
import ChartBlock from './ChartBlock.vue';

/** 富文本渲染入口：Markdown 与图表混排，任一图表失败不影响其余内容。 */
const props = defineProps<{
  source: string;
}>();

const segments = computed(() =>
  splitContentSegments(
    props.source,
    applicationDependencies.chartRendererRegistry.languages,
  ),
);
</script>

<template>
  <div class="rich-content">
    <template v-for="(segment, index) in segments" :key="index">
      <!-- eslint-disable-next-line vue/no-v-html -- 内容已经过 DOMPurify 消毒 -->
      <div
        v-if="segment.kind === 'markdown'"
        class="rich-content__markdown"
        v-html="renderMarkdownToHtml(segment.source)"
      ></div>
      <ChartBlock v-else :code="segment.code" :language="segment.language" />
    </template>
  </div>
</template>

<style scoped>
.rich-content__markdown :deep(table) {
  border-collapse: collapse;
}

.rich-content__markdown :deep(th),
.rich-content__markdown :deep(td) {
  border: 1px solid #d0d7de;
  padding: 0.375rem 0.75rem;
}
</style>
