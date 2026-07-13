<script setup lang="ts">
import { ref, watch } from 'vue';

import type {
  KnowledgeDocumentContent,
  KnowledgeDocumentSummary,
} from '../../domain/admin-workspace';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import {
  documentStatusLabels,
  formatBytes,
  formatDate,
} from '../admin-display';
import BaseIcon from './BaseIcon.vue';
import BaseModal from './BaseModal.vue';

const props = defineProps<{
  moduleId: string;
  moduleName: string;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const workspaceStore = useAdminWorkspaceStore();
const documents = ref<KnowledgeDocumentSummary[]>([]);
const loading = ref(false);
const preview = ref<KnowledgeDocumentContent | undefined>();

watch(
  () => props.open,
  (open) => {
    if (open) {
      preview.value = undefined;
      void loadDocuments();
    }
  },
);

async function loadDocuments(): Promise<void> {
  loading.value = true;

  try {
    documents.value = await workspaceStore.listModuleDocuments(props.moduleId);
  } catch {
    documents.value = [];
  } finally {
    loading.value = false;
  }
}

async function previewDocument(
  document: KnowledgeDocumentSummary,
): Promise<void> {
  try {
    preview.value = await workspaceStore.getKnowledgeDocumentContent(
      document.id,
    );
  } catch {
    return;
  }
}

async function deleteDocument(
  document: KnowledgeDocumentSummary,
): Promise<void> {
  if (
    !window.confirm(
      `确认删除文档「${document.fileName}」？向量索引将同步清理。`,
    )
  ) {
    return;
  }

  try {
    await workspaceStore.deleteKnowledgeDocument(document.id);
    documents.value = documents.value.filter((item) => item.id !== document.id);

    if (preview.value?.id === document.id) {
      preview.value = undefined;
    }
  } catch {
    return;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="`「${moduleName}」文档管理`"
    description="查看模块内的文档、处理状态和分片数量，可删除不再需要的文档。"
    @close="emit('close')"
  >
    <p v-if="loading" class="documents-hint">正在加载文档列表…</p>
    <p v-else-if="!documents.length" class="documents-hint">
      模块内还没有文档，可在模块卡片上传。
    </p>
    <ul v-else class="documents-list">
      <li v-for="document in documents" :key="document.id">
        <div class="documents-list__main">
          <strong>{{ document.fileName }}</strong>
          <small>
            {{ formatBytes(document.sizeBytes) }} ·
            {{ document.chunkCount }} 个分片 ·
            {{ formatDate(document.updatedAt) }}
          </small>
          <small v-if="document.errorMessage" class="documents-list__error">
            {{ document.errorMessage }}
          </small>
        </div>
        <span
          class="status-badge"
          :class="`status-badge--${document.status === 'ready' ? 'ready' : document.status === 'failed' ? 'failed' : 'processing'}`"
        >
          {{ documentStatusLabels[document.status] }}
        </span>
        <button
          v-if="document.status === 'ready'"
          class="icon-button"
          type="button"
          aria-label="预览内容"
          @click="previewDocument(document)"
        >
          <BaseIcon name="document" />
        </button>
        <button
          class="icon-button icon-button--danger"
          type="button"
          aria-label="删除文档"
          @click="deleteDocument(document)"
        >
          <BaseIcon name="trash" />
        </button>
      </li>
    </ul>
    <section v-if="preview" class="document-preview">
      <header>
        <strong>{{ preview.fileName }}</strong>
        <button
          class="icon-button"
          type="button"
          aria-label="关闭预览"
          @click="preview = undefined"
        >
          <BaseIcon name="close" />
        </button>
      </header>
      <pre>{{ preview.content }}</pre>
      <small v-if="preview.truncated">内容较长，仅展示开头部分。</small>
    </section>
  </BaseModal>
</template>
