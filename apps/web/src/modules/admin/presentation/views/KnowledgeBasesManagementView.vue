<script setup lang="ts">
import { reactive, ref } from 'vue';

import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';
import { resourceStatusLabels } from '../admin-display';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';

const workspaceStore = useAdminWorkspaceStore();
const createModalOpen = ref(false);
const form = reactive({
  description: '',
  name: '',
});

function createKnowledgeBase(): void {
  if (!form.name.trim() || !form.description.trim()) {
    return;
  }

  workspaceStore.createKnowledgeBase({
    description: form.description.trim(),
    name: form.name.trim(),
  });
  createModalOpen.value = false;
}

function handleFiles(knowledgeBaseId: string, event: Event): void {
  const input = event.target;

  if (!(input instanceof HTMLInputElement) || !input.files?.length) {
    return;
  }

  workspaceStore.addKnowledgeFiles(knowledgeBaseId, input.files.length);
  input.value = '';
}

function openCreateModal(): void {
  form.name = '';
  form.description = '';
  createModalOpen.value = true;
}
</script>

<template>
  <div class="admin-page">
    <section class="knowledge-overview">
      <div>
        <span class="section-kicker">支持 TXT、Word、PDF、Markdown</span>
        <h2>把企业资料变成可检索的知识</h2>
        <p>文档由后台完成解析、清洗、切片和索引，前台测试页只负责对话。</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        <BaseIcon name="plus" />
        新建知识库
      </button>
    </section>

    <section class="knowledge-grid">
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
          <button class="icon-button" type="button" aria-label="更多操作">
            <BaseIcon name="more" />
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
              ><strong>{{ knowledgeBase.size }}</strong> 总大小</span
            >
          </div>
          <div
            v-if="knowledgeBase.status === 'processing'"
            class="processing-bar"
          >
            <span></span>
          </div>
        </div>
        <footer class="resource-card__footer">
          <span>{{ knowledgeBase.updatedAt }}</span>
          <div>
            <label class="text-button file-button">
              <BaseIcon name="upload" />
              上传文档
              <input
                type="file"
                accept=".txt,.doc,.docx,.pdf,.md"
                multiple
                @change="handleFiles(knowledgeBase.id, $event)"
              />
            </label>
            <button class="primary-button primary-button--small" type="button">
              管理内容
            </button>
          </div>
        </footer>
      </article>

      <button
        class="create-resource-card"
        type="button"
        @click="openCreateModal"
      >
        <span><BaseIcon name="database" /></span>
        <strong>新建知识库</strong>
        <small>按业务主题组织资料，让智能体回答更准确。</small>
      </button>
    </section>

    <section class="panel-card process-explanation">
      <header class="panel-card__header">
        <div>
          <h2>文档处理流程</h2>
          <p>上传后由后台自动完成处理，无需在对话页进行配置。</p>
        </div>
      </header>
      <ol>
        <li>
          <span>01</span>
          <div>
            <strong>安全上传</strong>
            <p>校验文件类型与大小</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>内容解析</strong>
            <p>提取文本与文档结构</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>清洗切片</strong>
            <p>去噪并生成语义片段</p>
          </div>
        </li>
        <li>
          <span>04</span>
          <div>
            <strong>向量索引</strong>
            <p>构建可检索知识内容</p>
          </div>
        </li>
      </ol>
    </section>

    <BaseModal
      :open="createModalOpen"
      title="新建知识库"
      description="按业务主题创建独立知识空间，创建后再上传资料。"
      @close="createModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="createKnowledgeBase">
        <label>
          <span>知识库名称</span>
          <input
            v-model="form.name"
            type="text"
            maxlength="40"
            placeholder="例如：产品资料库"
            required
          />
        </label>
        <label>
          <span>用途说明</span>
          <textarea
            v-model="form.description"
            rows="4"
            maxlength="180"
            placeholder="说明这个知识库包含哪些资料"
            required
          ></textarea>
        </label>
        <div class="form-actions">
          <button
            class="secondary-button"
            type="button"
            @click="createModalOpen = false"
          >
            取消
          </button>
          <button class="primary-button" type="submit">创建知识库</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
