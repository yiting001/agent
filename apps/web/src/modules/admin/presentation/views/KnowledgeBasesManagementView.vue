<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';
import KnowledgeBaseCard from '../components/KnowledgeBaseCard.vue';
import KnowledgeDocumentsModal from '../components/KnowledgeDocumentsModal.vue';

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
const editForm = reactive({
  description: '',
  id: '',
  name: '',
  target: 'base' as 'base' | 'module',
});
const editModalOpen = ref(false);
const documentsModule = ref({ id: '', name: '' });
const documentsModalOpen = ref(false);
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

function openEditModal(
  target: 'base' | 'module',
  resource: { description: string; id: string; name: string },
): void {
  editForm.target = target;
  editForm.id = resource.id;
  editForm.name = resource.name;
  editForm.description = resource.description;
  editModalOpen.value = true;
}

async function saveEdit(): Promise<void> {
  if (!editForm.name.trim() || !editForm.description.trim()) {
    return;
  }

  const input = {
    description: editForm.description.trim(),
    id: editForm.id,
    name: editForm.name.trim(),
  };

  try {
    await (editForm.target === 'base'
      ? workspaceStore.updateKnowledgeBase(input)
      : workspaceStore.updateKnowledgeModule(input));
    editModalOpen.value = false;
  } catch {
    return;
  }
}

async function deleteKnowledgeBase(knowledgeBase: {
  id: string;
  name: string;
}): Promise<void> {
  if (
    !window.confirm(
      `确认删除知识库「${knowledgeBase.name}」？其下所有模块、文档和向量索引都会被清理。`,
    )
  ) {
    return;
  }

  try {
    await workspaceStore.deleteKnowledgeBase(knowledgeBase.id);
  } catch {
    return;
  }
}

async function deleteKnowledgeModule(module: {
  id: string;
  name: string;
}): Promise<void> {
  if (
    !window.confirm(
      `确认删除模块「${module.name}」？模块内文档和向量索引都会被清理。`,
    )
  ) {
    return;
  }

  try {
    await workspaceStore.deleteKnowledgeModule(module.id);
  } catch {
    return;
  }
}

function openDocumentsModal(module: { id: string; name: string }): void {
  documentsModule.value = { id: module.id, name: module.name };
  documentsModalOpen.value = true;
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
      <KnowledgeBaseCard
        v-for="knowledgeBase in workspaceStore.knowledgeBases"
        :key="knowledgeBase.id"
        :knowledge-base="knowledgeBase"
        @create-module="openModuleModal(knowledgeBase.id)"
        @edit-base="openEditModal('base', knowledgeBase)"
        @delete-base="deleteKnowledgeBase(knowledgeBase)"
        @edit-module="(module) => openEditModal('module', module)"
        @delete-module="(module) => deleteKnowledgeModule(module)"
        @view-documents="(module) => openDocumentsModal(module)"
        @upload-files="handleFiles"
      />
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
          <p>大文件按 8MB 分片上传，后台任务自动解析并写入 Zvec。</p>
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
    <BaseModal
      :open="editModalOpen"
      :title="editForm.target === 'base' ? '编辑知识库' : '编辑知识模块'"
      description="修改名称和用途说明，嵌入模型创建后不可更换。"
      @close="editModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="saveEdit">
        <label>
          <span>名称</span>
          <input v-model="editForm.name" maxlength="80" required />
        </label>
        <label>
          <span>用途说明</span>
          <textarea
            v-model="editForm.description"
            rows="3"
            maxlength="240"
            required
          ></textarea>
        </label>
        <div class="form-actions">
          <button
            class="secondary-button"
            type="button"
            @click="editModalOpen = false"
          >
            取消
          </button>
          <button
            class="primary-button"
            type="submit"
            :disabled="workspaceStore.isSaving"
          >
            {{ workspaceStore.isSaving ? '正在保存…' : '保存修改' }}
          </button>
        </div>
      </form>
    </BaseModal>

    <KnowledgeDocumentsModal
      :open="documentsModalOpen"
      :module-id="documentsModule.id"
      :module-name="documentsModule.name"
      @close="documentsModalOpen = false"
    />
  </div>
</template>
