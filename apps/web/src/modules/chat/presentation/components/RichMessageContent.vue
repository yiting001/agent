<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { renderRichMarkdown } from '../rich-content/rich-message-markdown';
import { renderVisualizations } from '../rich-content/rich-visualization.renderer';

const props = defineProps<{
  content: string;
  streaming?: boolean;
}>();
const root = ref<HTMLElement>();
const renderedContent = computed(() => renderRichMarkdown(props.content));
let disposeVisualizations = (): void => undefined;
let renderVersion = 0;

watch(
  [renderedContent, (): boolean | undefined => props.streaming],
  async () => {
    const version = ++renderVersion;

    disposeVisualizations();
    disposeVisualizations = (): void => undefined;

    if (props.streaming) {
      return;
    }

    await nextTick();

    if (!root.value || version !== renderVersion) {
      return;
    }

    const dispose = await renderVisualizations(root.value);

    if (version === renderVersion) {
      disposeVisualizations = dispose;
    } else {
      dispose();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => disposeVisualizations());
</script>

<template>
  <!-- renderedContent 已经过 DOMPurify 白名单消毒，禁止直接注入原始模型输出。 -->
  <div ref="root" class="rich-message-content" v-html="renderedContent"></div>
</template>
