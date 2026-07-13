<script setup lang="ts">
import type {
  KnowledgeBaseSummary,
  KnowledgeModuleSummary,
} from '../../domain/admin-workspace';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import {
  formatBytes,
  formatDate,
  resourceStatusLabels,
} from '../admin-display';
import BaseIcon from './BaseIcon.vue';

defineProps<{
  knowledgeBase: KnowledgeBaseSummary;
}>();

const emit = defineEmits<{
  createModule: [];
  deleteBase: [];
  deleteModule: [module: KnowledgeModuleSummary];
  editBase: [];
  editModule: [module: KnowledgeModuleSummary];
  uploadFiles: [moduleId: string, event: Event];
  viewDocuments: [module: KnowledgeModuleSummary];
}>();

const workspaceStore = useAdminWorkspaceStore();
</script>

<template>
  <article class="resource-card knowledge-card">
    <header class="resource-card__header">
      <span class="resource-avatar resource-avatar--database">
        <BaseIcon name="database" />
      </span>
      <span
        class="status-badge"
        :class="`status-badge--${knowledgeBase.status}`"
      >
        <i v-if="knowledgeBase.status === 'processing'"></i>
        {{ resourceStatusLabels[knowledgeBase.status] }}
      </span>
      <button class="text-button" type="button" @click="emit('createModule')">
        <BaseIcon name="plus" />
        新增模块
      </button>
      <button
        class="icon-button"
        type="button"
        aria-label="编辑知识库"
        @click="emit('editBase')"
      >
        <BaseIcon name="edit" />
      </button>
      <button
        class="icon-button icon-button--danger"
        type="button"
        aria-label="删除知识库"
        @click="emit('deleteBase')"
      >
        <BaseIcon name="trash" />
      </button>
    </header>
    <div class="resource-card__body">
      <h2>{{ knowledgeBase.name }}</h2>
      <p>{{ knowledgeBase.description }}</p>
      <div class="knowledge-card__stats">
        <span
          ><strong>{{ knowledgeBase.documentCount }}</strong> 个文档</span
        >
        <span
          ><strong>{{ formatBytes(knowledgeBase.sizeBytes) }}</strong>
          总大小</span
        >
      </div>
      <small>
        {{ knowledgeBase.embeddingModel }} ·
        {{ knowledgeBase.embeddingDimensions }} 维
      </small>
      <div class="knowledge-modules">
        <section
          v-for="module in knowledgeBase.modules"
          :key="module.id"
          class="knowledge-module"
        >
          <div>
            <strong>{{ module.name }}</strong>
            <small>
              {{ module.documentCount }} 个文档 ·
              {{ formatBytes(module.sizeBytes) }}
            </small>
            <p>{{ module.description }}</p>
          </div>
          <div class="knowledge-module__actions">
            <button
              class="icon-button"
              type="button"
              aria-label="查看文档"
              @click="emit('viewDocuments', module)"
            >
              <BaseIcon name="document" />
            </button>
            <button
              class="icon-button"
              type="button"
              aria-label="编辑模块"
              @click="emit('editModule', module)"
            >
              <BaseIcon name="edit" />
            </button>
            <button
              class="icon-button icon-button--danger"
              type="button"
              aria-label="删除模块"
              @click="emit('deleteModule', module)"
            >
              <BaseIcon name="trash" />
            </button>
          </div>
          <label class="text-button file-button">
            <BaseIcon name="upload" />
            {{
              workspaceStore.uploadProgress[module.id] === undefined
                ? '上传文档'
                : `${workspaceStore.uploadProgress[module.id]}%`
            }}
            <input
              type="file"
              accept=".txt,.docx,.pdf,.md,.markdown,.html,.htm,.csv,.json"
              multiple
              :disabled="workspaceStore.uploadProgress[module.id] !== undefined"
              @change="emit('uploadFiles', module.id, $event)"
            />
          </label>
        </section>
      </div>
    </div>
    <footer class="resource-card__footer">
      <span>更新于 {{ formatDate(knowledgeBase.updatedAt) }}</span>
      <span>{{ knowledgeBase.modules.length }} 个可复用模块</span>
    </footer>
  </article>
</template>
