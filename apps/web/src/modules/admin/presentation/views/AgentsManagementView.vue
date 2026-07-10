<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import type { AgentStatus, AgentSummary } from '../../domain/admin-workspace';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import { agentStatusLabels, formatCount, formatDate } from '../admin-display';
import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';

const workspaceStore = useAdminWorkspaceStore();
const editorModalOpen = ref(false);
const editingAgentId = ref('');
const deleteCandidate = ref<AgentSummary>();
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
const isEditing = computed(() => Boolean(editingAgentId.value));

function openCreateModal(): void {
  editingAgentId.value = '';
  form.name = '';
  form.description = '';
  form.providerId = availableProviders.value[0]?.id ?? '';
  form.moduleIds = [];
  form.systemPrompt = '你是专业、严谨的企业知识助手，请依据知识库准确回答。';
  form.temperature = 0.3;
  editorModalOpen.value = true;
}

function openEditModal(agent: AgentSummary): void {
  editingAgentId.value = agent.id;
  form.name = agent.name;
  form.description = agent.description;
  form.providerId = agent.providerId;
  form.moduleIds = [...agent.moduleIds];
  form.systemPrompt = agent.systemPrompt;
  form.temperature = agent.temperature;
  editorModalOpen.value = true;
}

async function saveAgent(): Promise<void> {
  if (
    !form.name.trim() ||
    !form.description.trim() ||
    !form.providerId ||
    !form.systemPrompt.trim()
  ) {
    return;
  }

  try {
    const input = {
      description: form.description.trim(),
      moduleIds: form.moduleIds,
      name: form.name.trim(),
      providerId: form.providerId,
      systemPrompt: form.systemPrompt.trim(),
      temperature: form.temperature,
    };

    if (editingAgentId.value) {
      await workspaceStore.updateAgent(editingAgentId.value, input);
    } else {
      await workspaceStore.createAgent(input);
    }

    editorModalOpen.value = false;
  } catch {
    return;
  }
}

function openDeleteModal(agent: AgentSummary): void {
  deleteCandidate.value = agent;
}

async function deleteAgent(): Promise<void> {
  if (!deleteCandidate.value) {
    return;
  }

  try {
    await workspaceStore.deleteAgent(deleteCandidate.value.id);
    deleteCandidate.value = undefined;
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
          <div>
            <button
              class="text-button"
              type="button"
              :disabled="workspaceStore.isSaving"
              @click="openEditModal(agent)"
            >
              编辑
            </button>
            <button
              class="text-button text-button--danger"
              type="button"
              :disabled="workspaceStore.isSaving"
              @click="openDeleteModal(agent)"
            >
              删除
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
      :open="editorModalOpen"
      :title="isEditing ? '编辑智能体' : '创建智能体'"
      :description="
        isEditing
          ? '修改模型、提示词和知识模块后立即保存到真实后端。'
          : '模型、提示词和知识模块均会保存到真实后端。'
      "
      @close="editorModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="saveAgent">
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
            @click="editorModalOpen = false"
          >
            取消
          </button>
          <button
            class="primary-button"
            type="submit"
            :disabled="workspaceStore.isSaving"
          >
            {{
              workspaceStore.isSaving
                ? '正在保存…'
                : isEditing
                  ? '保存修改'
                  : '创建智能体'
            }}
          </button>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      :open="Boolean(deleteCandidate)"
      title="删除智能体"
      description="此操作不可撤销，相关 API 接入应用也会一并删除。"
      @close="deleteCandidate = undefined"
    >
      <p class="confirmation-message">
        确定删除“{{ deleteCandidate?.name }}”吗？知识库和共享模块不会被删除。
      </p>
      <div class="form-actions">
        <button
          class="secondary-button"
          type="button"
          @click="deleteCandidate = undefined"
        >
          取消
        </button>
        <button
          class="primary-button danger-button"
          type="button"
          :disabled="workspaceStore.isSaving"
          @click="deleteAgent"
        >
          {{ workspaceStore.isSaving ? '正在删除…' : '确认删除' }}
        </button>
      </div>
    </BaseModal>
  </div>
</template>
