<script setup lang="ts">
import type { KnowledgeEntry } from '../../domain/knowledge-entry';

defineProps<{
  entries: readonly KnowledgeEntry[];
  selectedId?: string;
}>();

const emit = defineEmits<{
  edit: [entry: KnowledgeEntry];
  remove: [entry: KnowledgeEntry];
  select: [entry: KnowledgeEntry];
}>();
</script>

<template>
  <ul class="knowledge-list">
    <li
      v-for="entry in entries"
      :key="entry.id"
      class="knowledge-list__item"
      :class="{ 'knowledge-list__item--active': entry.id === selectedId }"
    >
      <button
        type="button"
        class="knowledge-list__title"
        @click="emit('select', entry)"
      >
        {{ entry.title }}
      </button>
      <p class="knowledge-list__meta">
        <span v-for="tag in entry.tags" :key="tag" class="knowledge-tag">
          {{ tag }}
        </span>
        更新于 {{ new Date(entry.updatedAt).toLocaleString() }}
      </p>
      <div class="knowledge-list__actions">
        <button type="button" @click="emit('edit', entry)">编辑</button>
        <button
          type="button"
          class="button--danger"
          @click="emit('remove', entry)"
        >
          删除
        </button>
      </div>
    </li>
  </ul>
</template>
