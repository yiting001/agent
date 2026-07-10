<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import { webApplicationConfig } from '@/config/application.config';

import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import {
  formatCount,
  formatDate,
  resourceStatusLabels,
} from '../admin-display';
import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';

const workspaceStore = useAdminWorkspaceStore();
const createModalOpen = ref(false);
const copiedValue = ref('');
const form = reactive({
  agentId: '',
  name: '',
});

const publishedAgents = computed(() =>
  workspaceStore.agents.filter((agent) => agent.status === 'published'),
);

function openCreateModal(): void {
  form.name = '';
  form.agentId = publishedAgents.value[0]?.id ?? '';
  workspaceStore.clearLatestSecretKey();
  createModalOpen.value = true;
}

async function createApplication(): Promise<void> {
  if (!form.name.trim() || !form.agentId) {
    return;
  }

  try {
    await workspaceStore.createApiApplication({
      agentId: form.agentId,
      name: form.name.trim(),
    });
    createModalOpen.value = false;
  } catch {
    return;
  }
}

function absoluteEndpoint(endpoint: string): string {
  return new URL(
    `${webApplicationConfig.apiBaseUrl}${endpoint}`,
    window.location.origin,
  ).toString();
}

async function copyValue(id: string, value: string): Promise<void> {
  if (!navigator.clipboard) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    copiedValue.value = id;
    window.setTimeout(() => {
      copiedValue.value = '';
    }, 1200);
  } catch {
    return;
  }
}
</script>

<template>
  <div class="admin-page">
    <section class="api-overview">
      <div class="api-overview__copy">
        <span class="section-kicker">OpenAI 兼容调用</span>
        <h2>将已发布智能体接入真实业务系统</h2>
        <p>每个应用使用独立密钥，后端完成鉴权、知识检索和模型调用。</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        <BaseIcon name="plus" />
        创建应用
      </button>
      <div class="api-endpoint-card">
        <span><BaseIcon name="api" /></span>
        <div>
          <small>标准对话接口</small>
          <code>/api/v1/chat/completions</code>
        </div>
        <span class="status-badge status-badge--published">Bearer 鉴权</span>
      </div>
    </section>

    <section class="panel-card api-applications">
      <header class="panel-card__header">
        <div>
          <h2>接入应用</h2>
          <p>原始密钥只在创建成功后展示一次，数据库仅保存哈希。</p>
        </div>
      </header>
      <div v-if="workspaceStore.apiApplications.length" class="data-table">
        <div class="data-table__header">
          <span>应用名称</span>
          <span>关联智能体</span>
          <span>访问凭证</span>
          <span>调用次数</span>
          <span>状态</span>
          <span>操作</span>
        </div>
        <div
          v-for="application in workspaceStore.apiApplications"
          :key="application.id"
          class="data-table__row"
        >
          <span class="data-table__application">
            <i><BaseIcon name="api" /></i>
            <span>
              <strong>{{ application.name }}</strong>
              <small>{{ formatDate(application.createdAt) }}</small>
            </span>
          </span>
          <span>{{ workspaceStore.agentName(application.agentId) }}</span>
          <code>{{ application.maskedKey }}</code>
          <span>{{ formatCount(application.requestCount) }}</span>
          <span
            class="status-badge"
            :class="`status-badge--${application.status}`"
          >
            {{ resourceStatusLabels[application.status] }}
          </span>
          <span class="data-table__actions">
            <button
              class="icon-button"
              type="button"
              aria-label="复制接口地址"
              @click="
                copyValue(
                  application.id,
                  absoluteEndpoint(application.endpoint),
                )
              "
            >
              <BaseIcon
                :name="copiedValue === application.id ? 'check' : 'copy'"
              />
            </button>
          </span>
        </div>
      </div>
      <div v-else class="empty-state empty-state--compact">
        <p>还没有接入应用，请先发布智能体。</p>
      </div>
    </section>

    <section class="api-guides">
      <article>
        <span>01</span>
        <div>
          <h3>发布智能体</h3>
          <p>草稿和停用状态不能通过正式 API 调用。</p>
        </div>
      </article>
      <article>
        <span>02</span>
        <div>
          <h3>保存一次性密钥</h3>
          <p>密钥关闭后无法再次查看，可重新创建应用。</p>
        </div>
      </article>
      <article>
        <span>03</span>
        <div>
          <h3>后端安全调用</h3>
          <p>使用 Authorization: Bearer ag_live_... 请求接口。</p>
        </div>
      </article>
    </section>

    <BaseModal
      :open="createModalOpen"
      title="创建接入应用"
      description="只允许选择已经发布的智能体。"
      @close="createModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="createApplication">
        <label>
          <span>应用名称</span>
          <input v-model="form.name" maxlength="80" required />
        </label>
        <label>
          <span>关联智能体</span>
          <select v-model="form.agentId" required>
            <option disabled value="">请选择已发布智能体</option>
            <option
              v-for="agent in publishedAgents"
              :key="agent.id"
              :value="agent.id"
            >
              {{ agent.name }}
            </option>
          </select>
          <small v-if="!publishedAgents.length">
            暂无已发布智能体，请先到智能体管理页发布。
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
            {{ workspaceStore.isSaving ? '正在创建…' : '创建应用' }}
          </button>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      :open="Boolean(workspaceStore.latestSecretKey)"
      title="请立即保存访问密钥"
      description="这是唯一一次展示原始密钥，关闭后无法找回。"
      @close="workspaceStore.clearLatestSecretKey"
    >
      <div class="secret-key-panel">
        <code>{{ workspaceStore.latestSecretKey }}</code>
        <button
          class="primary-button"
          type="button"
          @click="copyValue('secret', workspaceStore.latestSecretKey)"
        >
          <BaseIcon :name="copiedValue === 'secret' ? 'check' : 'copy'" />
          {{ copiedValue === 'secret' ? '已复制' : '复制密钥' }}
        </button>
      </div>
    </BaseModal>
  </div>
</template>
