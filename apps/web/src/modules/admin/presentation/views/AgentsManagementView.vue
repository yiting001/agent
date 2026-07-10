<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';
import { agentStatusLabels, formatCount } from '../admin-display';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';

const workspaceStore = useAdminWorkspaceStore();
const createModalOpen = ref(false);
const searchTerm = ref('');
const form = reactive({
  description: '',
  model: 'DeepSeek-V3',
  name: '',
});

const filteredAgents = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();

  if (!query) {
    return workspaceStore.agents;
  }

  return workspaceStore.agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(query) ||
      agent.description.toLowerCase().includes(query),
  );
});

function openCreateModal(): void {
  form.name = '';
  form.description = '';
  form.model = 'DeepSeek-V3';
  createModalOpen.value = true;
}

function createAgent(): void {
  if (!form.name.trim() || !form.description.trim()) {
    return;
  }

  workspaceStore.createAgent({
    description: form.description.trim(),
    model: form.model,
    name: form.name.trim(),
  });
  createModalOpen.value = false;
}
</script>

<template>
  <div class="admin-page">
    <section class="page-toolbar">
      <label class="toolbar-search">
        <BaseIcon name="search" />
        <input
          v-model="searchTerm"
          type="search"
          placeholder="搜索智能体名称…"
        />
      </label>
      <div class="page-toolbar__actions">
        <RouterLink class="secondary-button" to="/chat/enterprise-assistant">
          <BaseIcon name="chat" />
          进入测试页
        </RouterLink>
        <button class="primary-button" type="button" @click="openCreateModal">
          <BaseIcon name="plus" />
          创建智能体
        </button>
      </div>
    </section>

    <section class="agent-grid">
      <article
        v-for="agent in filteredAgents"
        :key="agent.id"
        class="resource-card agent-card"
      >
        <header class="resource-card__header">
          <span class="resource-avatar resource-avatar--large">
            <BaseIcon name="bot" />
          </span>
          <span class="status-badge" :class="`status-badge--${agent.status}`">
            {{ agentStatusLabels[agent.status] }}
          </span>
          <button class="icon-button" type="button" aria-label="更多操作">
            <BaseIcon name="more" />
          </button>
        </header>
        <div class="resource-card__body">
          <h2>{{ agent.name }}</h2>
          <p>{{ agent.description }}</p>
          <dl class="agent-card__meta">
            <div>
              <dt>使用模型</dt>
              <dd>{{ agent.model }}</dd>
            </div>
            <div>
              <dt>知识库</dt>
              <dd>{{ agent.knowledgeBaseCount }} 个</dd>
            </div>
            <div>
              <dt>对话次数</dt>
              <dd>{{ formatCount(agent.conversationCount) }}</dd>
            </div>
          </dl>
        </div>
        <footer class="resource-card__footer">
          <span>更新于 {{ agent.updatedAt }}</span>
          <div>
            <button class="text-button" type="button">
              <BaseIcon name="settings" />
              配置
            </button>
            <RouterLink
              class="primary-button primary-button--small"
              :to="`/chat/${agent.id}`"
            >
              <BaseIcon name="chat" />
              测试
            </RouterLink>
          </div>
        </footer>
      </article>

      <button
        class="create-resource-card"
        type="button"
        @click="openCreateModal"
      >
        <span><BaseIcon name="plus" /></span>
        <strong>创建新的智能体</strong>
        <small>选择模型和知识库，快速构建业务助手。</small>
      </button>
    </section>

    <BaseModal
      :open="createModalOpen"
      title="创建智能体"
      description="先填写基础信息，创建后可继续完善提示词和知识库。"
      @close="createModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="createAgent">
        <label>
          <span>智能体名称</span>
          <input
            v-model="form.name"
            type="text"
            maxlength="40"
            placeholder="例如：企业知识助手"
            required
          />
        </label>
        <label>
          <span>功能描述</span>
          <textarea
            v-model="form.description"
            rows="4"
            maxlength="180"
            placeholder="说明这个智能体面向谁、解决什么问题"
            required
          ></textarea>
        </label>
        <label>
          <span>默认模型</span>
          <select v-model="form.model">
            <option>DeepSeek-V3</option>
            <option>通义千问-Max</option>
            <option>豆包-Pro</option>
          </select>
        </label>
        <div class="form-actions">
          <button
            class="secondary-button"
            type="button"
            @click="createModalOpen = false"
          >
            取消
          </button>
          <button class="primary-button" type="submit">创建智能体</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
