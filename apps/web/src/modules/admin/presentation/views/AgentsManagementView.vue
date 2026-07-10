<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import type { AgentStatus } from '../../domain/admin-workspace';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import { agentStatusLabels, formatCount, formatDate } from '../admin-display';
import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';

const workspaceStore = useAdminWorkspaceStore();
const createModalOpen = ref(false);
const searchTerm = ref('');
const form = reactive({
  description: '',
  moduleIds: [] as string[],
  name: '',
  providerId: '',
  systemPrompt: '你是专业、严谨的企业知识助手，请依据知识库准确回答。',
  temperature: 0.3,
});

const availableProviders = computed(() =>
  workspaceStore.modelProviders.filter(
    (provider) => provider.enabled && provider.chatModel,
  ),
);
const knowledgeModules = computed(() =>
  workspaceStore.knowledgeBases.flatMap((knowledgeBase) =>
    knowledgeBase.modules.map((module) => ({
      ...module,
      knowledgeBaseName: knowledgeBase.name,
    })),
  ),
);
const filteredAgents = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();

  return query
    ? workspaceStore.agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query),
      )
    : workspaceStore.agents;
});

function openCreateModal(): void {
  form.name = '';
  form.description = '';
  form.providerId = availableProviders.value[0]?.id ?? '';
  form.moduleIds = [];
  form.systemPrompt = '你是专业、严谨的企业知识助手，请依据知识库准确回答。';
  form.temperature = 0.3;
  createModalOpen.value = true;
}

async function createAgent(): Promise<void> {
  if (
    !form.name.trim() ||
    !form.description.trim() ||
    !form.providerId ||
    !form.systemPrompt.trim()
  ) {
    return;
  }

  try {
    await workspaceStore.createAgent({
      description: form.description.trim(),
      moduleIds: form.moduleIds,
      name: form.name.trim(),
      providerId: form.providerId,
      systemPrompt: form.systemPrompt.trim(),
      temperature: form.temperature,
    });
    createModalOpen.value = false;
  } catch {
    return;
  }
}

function nextStatus(status: AgentStatus): AgentStatus {
  return status === 'published' ? 'disabled' : 'published';
}

async function toggleStatus(
  agentId: string,
  status: AgentStatus,
): Promise<void> {
  try {
    await workspaceStore.updateAgentStatus(agentId, nextStatus(status));
  } catch {
    return;
  }
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
        <RouterLink
          v-if="workspaceStore.agents[0]"
          class="secondary-button"
          :to="`/chat/${workspaceStore.agents[0].id}`"
        >
          <BaseIcon name="chat" />
          进入测试页
        </RouterLink>
        <button class="primary-button" type="button" @click="openCreateModal">
          <BaseIcon name="plus" />
          创建智能体
        </button>
      </div>
    </section>

    <section v-if="filteredAgents.length" class="agent-grid">
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
          <button
            class="text-button"
            type="button"
            :disabled="workspaceStore.isSaving"
            @click="toggleStatus(agent.id, agent.status)"
          >
            {{ agent.status === 'published' ? '停用' : '发布' }}
          </button>
        </header>
        <div class="resource-card__body">
          <h2>{{ agent.name }}</h2>
          <p>{{ agent.description }}</p>
          <dl class="agent-card__meta">
            <div>
              <dt>使用模型</dt>
              <dd>{{ workspaceStore.providerName(agent.providerId) }}</dd>
            </div>
            <div>
              <dt>共享模块</dt>
              <dd>{{ agent.moduleIds.length }} 个</dd>
            </div>
            <div>
              <dt>对话次数</dt>
              <dd>{{ formatCount(agent.conversationCount) }}</dd>
            </div>
          </dl>
        </div>
        <footer class="resource-card__footer">
          <span>更新于 {{ formatDate(agent.updatedAt) }}</span>
          <RouterLink
            class="primary-button primary-button--small"
            :to="`/chat/${agent.id}`"
          >
            <BaseIcon name="chat" />
            测试
          </RouterLink>
        </footer>
      </article>

      <button
        class="create-resource-card"
        type="button"
        @click="openCreateModal"
      >
        <span><BaseIcon name="plus" /></span>
        <strong>创建新的智能体</strong>
        <small>选择真实模型和可复用知识模块，构建业务助手。</small>
      </button>
    </section>

    <section v-else-if="!workspaceStore.isLoading" class="empty-state">
      <BaseIcon name="bot" />
      <h2>还没有智能体</h2>
      <p>请先配置模型服务，再创建并绑定共享知识模块。</p>
      <button class="primary-button" type="button" @click="openCreateModal">
        创建第一个智能体
      </button>
    </section>

    <BaseModal
      :open="createModalOpen"
      title="创建智能体"
      description="模型、提示词和知识模块均会保存到真实后端。"
      @close="createModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="createAgent">
        <label>
          <span>智能体名称</span>
          <input v-model="form.name" maxlength="80" required />
        </label>
        <label>
          <span>功能描述</span>
          <textarea
            v-model="form.description"
            rows="3"
            maxlength="240"
            required
          ></textarea>
        </label>
        <label>
          <span>对话模型</span>
          <select v-model="form.providerId" required>
            <option disabled value="">请选择已配置的模型服务</option>
            <option
              v-for="provider in availableProviders"
              :key="provider.id"
              :value="provider.id"
            >
              {{ provider.name }} · {{ provider.chatModel }}
            </option>
          </select>
          <small v-if="!availableProviders.length">
            请先到“模型配置”接入真实模型。
          </small>
        </label>
        <label>
          <span>系统提示词</span>
          <textarea
            v-model="form.systemPrompt"
            rows="4"
            maxlength="4000"
            required
          ></textarea>
        </label>
        <label>
          <span>生成温度：{{ form.temperature }}</span>
          <input
            v-model.number="form.temperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
          />
        </label>
        <fieldset class="module-selector">
          <legend>共享知识模块</legend>
          <label v-for="module in knowledgeModules" :key="module.id">
            <input
              v-model="form.moduleIds"
              type="checkbox"
              :value="module.id"
            />
            <span>{{ module.knowledgeBaseName }} / {{ module.name }}</span>
          </label>
          <small v-if="!knowledgeModules.length"
            >暂无知识模块，可稍后创建。</small
          >
        </fieldset>
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
            {{ workspaceStore.isSaving ? '正在创建…' : '创建智能体' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
