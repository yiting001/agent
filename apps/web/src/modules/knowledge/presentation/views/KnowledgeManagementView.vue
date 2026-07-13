<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import KnowledgeEntryForm from '../components/KnowledgeEntryForm.vue';
import KnowledgeEntryList from '../components/KnowledgeEntryList.vue';
import type {
  KnowledgeEntry,
  KnowledgeEntryDraft,
} from '../../domain/knowledge-entry';
import { useKnowledgeEntryStore } from '../../stores/knowledge-entry.store';

const store = useKnowledgeEntryStore();

const editingEntry = ref<KnowledgeEntry>();
const selectedId = ref<string>();

const selectedEntry = computed(() =>
  store.entries.find((entry) => entry.id === selectedId.value),
);

onMounted(() => store.loadEntries());

async function submitDraft(draft: KnowledgeEntryDraft): Promise<void> {
  const saved = editingEntry.value
    ? await store.updateEntry(editingEntry.value.id, draft)
    : await store.createEntry(draft);

  if (saved) {
    editingEntry.value = undefined;
  }
}

async function removeEntry(entry: KnowledgeEntry): Promise<void> {
  const removed = await store.removeEntry(entry.id);

  if (removed && selectedId.value === entry.id) {
    selectedId.value = undefined;
  }

  if (removed && editingEntry.value?.id === entry.id) {
    editingEntry.value = undefined;
  }
}
</script>

<template>
  <main class="knowledge-shell">
    <header class="knowledge-header">
      <p class="eyebrow">Knowledge base</p>
      <h1>知识库管理</h1>
      <p class="knowledge-header__summary">
        新建、编辑、删除知识条目，并查看条目的完整内容。
      </p>
    </header>

    <p v-if="store.errorMessage" class="status-error">
      {{ store.errorMessage }}
    </p>

    <div class="knowledge-layout">
      <section class="knowledge-panel">
        <h2>条目列表</h2>
        <p v-if="store.isLoading" class="status-placeholder">加载中…</p>
        <p v-else-if="store.entries.length === 0" class="status-placeholder">
          知识库为空，先在右侧创建第一条知识。
        </p>
        <KnowledgeEntryList
          v-else
          :entries="store.entries"
          :selected-id="selectedId"
          @edit="editingEntry = $event"
          @remove="removeEntry"
          @select="selectedId = $event.id"
        />
      </section>

      <section class="knowledge-panel">
        <KnowledgeEntryForm
          :entry="editingEntry"
          :is-saving="store.isSaving"
          @cancel="editingEntry = undefined"
          @submit="submitDraft"
        />

        <article v-if="selectedEntry" class="knowledge-detail">
          <h2>{{ selectedEntry.title }}</h2>
          <p class="knowledge-list__meta">
            <span
              v-for="tag in selectedEntry.tags"
              :key="tag"
              class="knowledge-tag"
            >
              {{ tag }}
            </span>
            创建于 {{ new Date(selectedEntry.createdAt).toLocaleString() }}
          </p>
          <pre class="knowledge-detail__content">{{
            selectedEntry.content
          }}</pre>
        </article>
      </section>
    </div>
  </main>
</template>
