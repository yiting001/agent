<script setup lang="ts">
import { reactive, ref } from 'vue';

import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import { formatCount, resourceStatusLabels } from '../admin-display';
import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';

const workspaceStore = useAdminWorkspaceStore();
const createModalOpen = ref(false);
const copiedApplicationId = ref('');
const form = reactive({
  agentName: '企业知识助手',
  name: '',
});

function openCreateModal(): void {
  form.name = '';
  form.agentName = workspaceStore.agents[0]?.name ?? '';
  createModalOpen.value = true;
}

function createApplication(): void {
  if (!form.name.trim() || !form.agentName) {
    return;
  }

  workspaceStore.createApiApplication({
    agentName: form.agentName,
    name: form.name.trim(),
  });
  createModalOpen.value = false;
}

async function copyEndpoint(
  applicationId: string,
  endpoint: string,
): Promise<void> {
  if (!navigator.clipboard) {
    return;
  }

  try {
    await navigator.clipboard.writeText(`${window.location.origin}${endpoint}`);
  } catch {
    return;
  }

  copiedApplicationId.value = applicationId;
  window.setTimeout(() => {
    copiedApplicationId.value = '';
  }, 1200);
}
</script>

<template>
  <div class="admin-page">
    <section class="api-overview">
      <div class="api-overview__copy">
        <span class="section-kicker">智能体应用接入</span>
        <h2>将已发布智能体安全接入业务系统</h2>
        <p>为每个应用创建独立访问凭证，统一控制调用权限和使用状态。</p>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        <BaseIcon name="plus" />
        创建应用
      </button>
      <div class="api-endpoint-card">
        <span><BaseIcon name="api" /></span>
        <div>
          <small>标准对话接口</small>
          <code>/v1/chat/completions</code>
        </div>
        <span class="status-badge status-badge--published">服务正常</span>
      </div>
    </section>

    <section class="panel-card api-applications">
      <header class="panel-card__header">
        <div>
          <h2>接入应用</h2>
          <p>密钥创建后只展示一次，列表中仅保留脱敏信息。</p>
        </div>
      </header>
      <div class="data-table">
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
              <small>创建于 {{ application.createdAt }}</small>
            </span>
          </span>
          <span>{{ application.agentName }}</span>
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
              :aria-label="
                copiedApplicationId === application.id
                  ? '已复制'
                  : '复制接口地址'
              "
              @click="copyEndpoint(application.id, application.endpoint)"
            >
              <BaseIcon
                :name="
                  copiedApplicationId === application.id ? 'check' : 'copy'
                "
              />
            </button>
            <button class="icon-button" type="button" aria-label="更多操作">
              <BaseIcon name="more" />
            </button>
          </span>
        </div>
      </div>
    </section>

    <section class="api-guides">
      <article>
        <span>01</span>
        <div>
          <h3>选择已发布智能体</h3>
          <p>草稿和停用状态的智能体不能创建正式应用。</p>
        </div>
      </article>
      <article>
        <span>02</span>
        <div>
          <h3>生成独立访问凭证</h3>
          <p>不同业务系统使用不同凭证，便于停用和审计。</p>
        </div>
      </article>
      <article>
        <span>03</span>
        <div>
          <h3>通过后端发起调用</h3>
          <p>业务端不得把访问凭证直接暴露在公开网页中。</p>
        </div>
      </article>
    </section>

    <BaseModal
      :open="createModalOpen"
      title="创建接入应用"
      description="为业务系统创建独立的智能体访问凭证。"
      @close="createModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="createApplication">
        <label>
          <span>应用名称</span>
          <input
            v-model="form.name"
            type="text"
            maxlength="40"
            placeholder="例如：企业官网对话"
            required
          />
        </label>
        <label>
          <span>关联智能体</span>
          <select v-model="form.agentName">
            <option
              v-for="agent in workspaceStore.agents.filter(
                (item) => item.status === 'published',
              )"
              :key="agent.id"
              :value="agent.name"
            >
              {{ agent.name }}
            </option>
          </select>
        </label>
        <div class="form-notice">
          <BaseIcon name="check" />
          <p>正式版本由后端生成密钥，本演示只创建脱敏记录。</p>
        </div>
        <div class="form-actions">
          <button
            class="secondary-button"
            type="button"
            @click="createModalOpen = false"
          >
            取消
          </button>
          <button class="primary-button" type="submit">创建应用</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
