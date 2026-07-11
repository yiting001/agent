<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

import type { ChartRenderCleanup } from '../../domain/chart-renderer';
import ChartFallback from './ChartFallback.vue';

/** 单个图表块：渲染成功显示图形，失败则降级为原文兜底展示。 */
const props = defineProps<{
  code: string;
  language: string;
}>();

const container = ref<HTMLElement>();
const errorMessage = ref('');
let cleanup: ChartRenderCleanup | undefined;

async function renderChart(): Promise<void> {
  cleanup?.();
  cleanup = undefined;
  errorMessage.value = '';

  const renderer = applicationDependencies.chartRendererRegistry.resolve(
    props.language,
  );
  if (!renderer || !container.value) {
    errorMessage.value = `暂不支持的图表类型：${props.language}`;
    return;
  }
  try {
    cleanup = await renderer.render(container.value, props.code);
  } catch (cause) {
    errorMessage.value =
      cause instanceof Error ? cause.message : '图表渲染出现未知错误';
  }
}

onMounted(renderChart);
watch(() => [props.language, props.code], renderChart);
onBeforeUnmount(() => cleanup?.());
</script>

<template>
  <ChartFallback
    v-if="errorMessage"
    :code="code"
    :language="language"
    :message="errorMessage"
  />
  <div v-show="!errorMessage" ref="container" class="chart-block"></div>
</template>

<style scoped>
.chart-block {
  min-height: 300px;
  width: 100%;
}
</style>
