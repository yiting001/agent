<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import {
  formatBytes,
  formatDate,
  resourceStatusLabels,
} from '../admin-display';
import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';

const workspaceStore = useAdminWorkspaceStore();
const createModalOpen = ref(false);
const moduleModalOpen = ref(false);
const selectedKnowledgeBaseId = ref('');
const form = reactive({
  description: '',
  embeddingProviderId: '',
  name: '',
});
const moduleForm = reactive({
  description: '',
  name: '',
});
let refreshTimer: number | undefined;

const embeddingProviders = computed(() =>
  workspaceStore.modelProviders.filter(
    (provider) =>
      provider.enabled &&
      provider.embeddingModel &&
      provider.embeddingDimensions,
  ),
);

onMounted(() => {
  refreshTimer = window.setInterval(() => {
    const hasProcessingKnowledge = workspaceStore.knowledgeBases.some(
      (knowledgeBase) =>
        knowledgeBase.status === 'processing' ||
        knowledgeBase.modules.some((module) => module.status === 'processing'),
    );

    if (hasProcessingKnowledge) {
      void workspaceStore.refreshKnowledgeBases();
    }
  }, 5000);
});

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
});

function openCreateModal(): void {
  form.name = '';
  form.description = '';
  form.embeddingProviderId = embeddingProviders.value[0]?.id ?? '';
  createModalOpen.value = true;
}

async function createKnowledgeBase(): Promise<void> {
  if (
    !form.name.trim() ||
    !form.description.trim() ||
    !form.embeddingProviderId
  ) {
    return;
  }

  try {
    await workspaceStore.createKnowledgeBase({
      description: form.description.trim(),
      embeddingProviderId: form.embeddingProviderId,
      name: form.name.trim(),
    });
    createModalOpen.value = false;
  } catch {
    return;
  }
}

function openModuleModal(knowledgeBaseId: string): void {
  selectedKnowledgeBaseId.value = knowledgeBaseId;
  moduleForm.name = '';
  moduleForm.description = '';
  moduleModalOpen.value = true;
}

async function createKnowledgeModule(): Promise<void> {
  if (
    !selectedKnowledgeBaseId.value ||
    !moduleForm.name.trim() ||
    !moduleForm.description.trim()
  ) {
    return;
  }

  try {
    await workspaceStore.createKnowledgeModule({
      description: moduleForm.description.trim(),
      knowledgeBaseId: selectedKnowledgeBaseId.value,
      name: moduleForm.name.trim(),
    });
    moduleModalOpen.value = false;
  } catch {
    return;
  }
}

async function handleFiles(moduleId: string, event: Event): Promise<void> {
  const input = event.target;

  if (!(input instanceof HTMLInputElement) || !input.files?.length) {
    return;
  }

  try {
    for (const file of Array.from(input.files)) {
      await workspaceStore.uploadKnowledgeFile(moduleId, file);
    }
  } catch {
    return;
  } finally {
    input.value = '';
  }
}
</script>

<template>
  <div class="admin-page">
    <section class="knowledge-overview">
      <div>
        <span class="section-kicker">分片上传 · 异步解析 · 向量检索</span>
        <h2>支撑 5～6GB 级共享知识空间</h2>
        <p>文件、元数据和向量索引分离存储；知识模块可被多个智能体复用。</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        <BaseIcon name="plus" />
        新建知识库
      </button>
    </section>

    <section v-if="workspaceStore.knowledgeBases.length" class="knowledge-grid">
      <article
        v-for="knowledgeBase in workspaceStore.knowledgeBases"
        :key="knowledgeBase.id"
        class="resource-card knowledge-card"
      >
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
          <button
            class="text-button"
            type="button"
            @click="openModuleModal(knowledgeBase.id)"
          >
            <BaseIcon name="plus" />
            新增模块
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
                  :disabled="
                    workspaceStore.uploadProgress[module.id] !== undefined
                  "
                  @change="handleFiles(module.id, $event)"
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
    </section>

    <section v-else-if="!workspaceStore.isLoading" class="empty-state">
      <BaseIcon name="database" />
      <h2>还没有知识库</h2>
      <p>先配置嵌入模型，再创建知识库和可复用模块。</p>
      <button class="primary-button" type="button" @click="openCreateModal">
        新建知识库
      </button>
    </section>

    <section class="panel-card process-explanation">
      <header class="panel-card__header">
        <div>
          <h2>真实文档处理链路</h2>
          <p>大文件按 8MB 分片上传，后台任务自动解析并写入 Qdrant。</p>
        </div>
      </header>
      <ol>
        <li>
          <span>01</span>
          <div>
            <strong>断点分片</strong>
            <p>逐片落盘，避免占满内存</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>格式解析</strong>
            <p>支持 PDF、DOCX、TXT 等</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>语义切片</strong>
            <p>重叠窗口保留上下文</p>
          </div>
        </li>
        <li>
          <span>04</span>
          <div>
            <strong>向量索引</strong>
            <p>批量写入独立向量库</p>
          </div>
        </li>
      </ol>
    </section>

    <BaseModal
      :open="createModalOpen"
      title="新建知识库"
      description="知识库创建后会自动生成默认模块。"
      @close="createModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="createKnowledgeBase">
        <label>
          <span>知识库名称</span>
          <input v-model="form.name" maxlength="80" required />
        </label>
        <label>
          <span>用途说明</span>
          <textarea
            v-model="form.description"
            rows="3"
            maxlength="240"
            required
          ></textarea>
        </label>
        <label>
          <span>嵌入模型</span>
          <select v-model="form.embeddingProviderId" required>
            <option disabled value="">请选择已配置嵌入模型的服务</option>
            <option
              v-for="provider in embeddingProviders"
              :key="provider.id"
              :value="provider.id"
            >
              {{ provider.name }} · {{ provider.embeddingModel }}
            </option>
          </select>
          <small v-if="!embeddingProviders.length">
            暂无嵌入模型，请先在模型配置中接入。
          </small>
        </label>
        <div class="form-actions">
          <button
            class="secondary-button"
            type="button"
            @click="createModalOpen = false"
          >
            取消
          </button>
          <button
            class="primary-button"
            type="submit"
            :disabled="workspaceStore.isSaving"
          >
            {{ workspaceStore.isSaving ? '正在创建…' : '创建知识库' }}
          </button>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      :open="moduleModalOpen"
      title="新增知识模块"
      description="模块可同时绑定到多个智能体，避免重复上传和索引。"
      @close="moduleModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="createKnowledgeModule">
        <label>
          <span>模块名称</span>
          <input v-model="moduleForm.name" maxlength="80" required />
        </label>
        <label>
          <span>模块说明</span>
          <textarea
            v-model="moduleForm.description"
            rows="3"
            maxlength="240"
            required
          ></textarea>
        </label>
        <div class="form-actions">
          <button
            class="secondary-button"
            type="button"
            @click="moduleModalOpen = false"
          >
            取消
          </button>
          <button
            class="primary-button"
            type="submit"
            :disabled="workspaceStore.isSaving"
          >
            创建模块
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
