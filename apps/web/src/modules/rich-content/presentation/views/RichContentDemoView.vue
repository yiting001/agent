<script setup lang="ts">
import { ref } from 'vue';

import RichContent from '../components/RichContent.vue';
import { richContentDemoSample } from './rich-content-demo.sample';

/** 富文本渲染演示页：左侧编辑源文本，右侧实时预览渲染结果。 */
const source = ref(richContentDemoSample);
</script>

<template>
  <main class="demo">
    <h1>富文本渲染演示</h1>
    <div class="demo__panes">
      <textarea
        v-model="source"
        class="demo__editor"
        aria-label="Markdown 源文本"
      ></textarea>
      <div class="demo__preview">
        <RichContent :source="source" />
      </div>
    </div>
  </main>
</template>

<style scoped>
.demo {
  margin: 0 auto;
  max-width: 1200px;
  padding: 1.5rem;
}

.demo__panes {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr 1fr;
}

.demo__editor {
  font-family: monospace;
  font-size: 0.875rem;
  min-height: 70vh;
  padding: 0.75rem;
  resize: vertical;
}

.demo__preview {
  border: 1px solid #d0d7de;
  border-radius: 6px;
  overflow: auto;
  padding: 1rem;
}
</style>
