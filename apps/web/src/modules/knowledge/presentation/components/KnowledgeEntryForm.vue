<script setup lang="ts">
import { ref, watch } from 'vue';

import type {
  KnowledgeEntry,
  KnowledgeEntryDraft,
} from '../../domain/knowledge-entry';

const props = defineProps<{
  entry?: KnowledgeEntry;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  submit: [draft: KnowledgeEntryDraft];
}>();

const title = ref('');
const content = ref('');
const tagsText = ref('');

watch(
  () => props.entry,
  (entry) => {
    title.value = entry?.title ?? '';
    content.value = entry?.content ?? '';
    tagsText.value = entry?.tags.join(', ') ?? '';
  },
  { immediate: true },
);

function parseTags(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function submit(): void {
  emit('submit', {
    content: content.value.trim(),
    tags: parseTags(tagsText.value),
    title: title.value.trim(),
  });
}
</script>

<template>
  <form class="knowledge-form" @submit.prevent="submit">
    <h2>{{ entry ? '编辑知识条目' : '新建知识条目' }}</h2>

    <label>
      标题
      <input v-model="title" type="text" required placeholder="条目标题" />
    </label>

    <label>
      内容
      <textarea
        v-model="content"
        rows="8"
        required
        placeholder="知识内容，支持多行文本"
      ></textarea>
    </label>

    <label>
      标签（用逗号分隔）
      <input v-model="tagsText" type="text" placeholder="架构, 规范" />
    </label>

    <div class="knowledge-form__actions">
      <button type="submit" :disabled="isSaving">
        {{ isSaving ? '保存中…' : '保存' }}
      </button>
      <button
        v-if="entry"
        type="button"
        class="button--secondary"
        @click="emit('cancel')"
      >
        取消编辑
      </button>
    </div>
  </form>
</template>
