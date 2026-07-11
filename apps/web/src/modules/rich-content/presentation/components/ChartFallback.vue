<script setup lang="ts">
/** 图表渲染失败时的兜底展示：保留原始代码可读，不中断整体内容渲染。 */
defineProps<{
  code: string;
  language: string;
  message: string;
}>();
</script>

<template>
  <div class="chart-fallback">
    <p class="chart-fallback__notice">
      图表渲染失败，已展示原始内容：{{ message }}
    </p>
    <pre class="chart-fallback__code"><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.chart-fallback {
  border: 1px solid #f0c36d;
  border-radius: 6px;
  background: #fdf6e3;
  padding: 0.75rem;
}

.chart-fallback__notice {
  margin: 0 0 0.5rem;
  color: #8a6d3b;
  font-size: 0.875rem;
}

.chart-fallback__code {
  margin: 0;
  overflow-x: auto;
  font-size: 0.8125rem;
}
</style>
