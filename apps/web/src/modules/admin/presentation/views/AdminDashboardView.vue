<script setup lang="ts">
import { onMounted } from 'vue';

import { useSystemStatusStore } from '@/modules/system/stores/system-status.store';

import BaseIcon from '../components/BaseIcon.vue';
import { agentStatusLabels, formatCount, formatDate } from '../admin-display';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';

const workspaceStore = useAdminWorkspaceStore();
const systemStatusStore = useSystemStatusStore();

onMounted(() => systemStatusStore.refresh());
</script>

<template>
  <div class="admin-page dashboard-page">
    <section class="welcome-panel">
      <div>
        <span class="section-kicker">智能体管理平台</span>
        <h2>上午好，管理员</h2>
        <p>在这里统一创建智能体、管理知识资料、配置模型并发布接口。</p>
      </div>
      <RouterLink class="primary-button" to="/agents">
        <BaseIcon name="plus" />
        创建智能体
      </RouterLink>
    </section>

    <section class="summary-grid" aria-label="平台数据概览">
      <article class="summary-card summary-card--purple">
        <span class="summary-card__icon"><BaseIcon name="bot" /></span>
        <div>
          <p>已发布智能体</p>
          <strong>{{ workspaceStore.publishedAgentCount }}</strong>
          <small>共 {{ workspaceStore.agents.length }} 个智能体</small>
        </div>
      </article>
      <article class="summary-card summary-card--blue">
        <span class="summary-card__icon"><BaseIcon name="document" /></span>
        <div>
          <p>知识库文档</p>
          <strong>{{ workspaceStore.documentCount }}</strong>
          <small
            >分布在 {{ workspaceStore.knowledgeBases.length }} 个知识库</small
          >
        </div>
      </article>
      <article class="summary-card summary-card--green">
        <span class="summary-card__icon"><BaseIcon name="model" /></span>
        <div>
          <p>已启用模型</p>
          <strong>{{ workspaceStore.enabledProviderCount }}</strong>
          <small>模型服务连接正常</small>
        </div>
      </article>
      <article class="summary-card summary-card--orange">
        <span class="summary-card__icon"><BaseIcon name="api" /></span>
        <div>
          <p>累计接口调用</p>
          <strong>{{ formatCount(workspaceStore.requestCount) }}</strong>
          <small>本月调用量稳定</small>
        </div>
      </article>
    </section>

    <div class="dashboard-grid">
      <section class="panel-card dashboard-agents">
        <header class="panel-card__header">
          <div>
            <h2>最近智能体</h2>
            <p>快速查看智能体状态和使用情况。</p>
          </div>
          <RouterLink class="text-link" to="/agents">查看全部</RouterLink>
        </header>
        <div v-if="workspaceStore.agents.length" class="simple-table">
          <div
            v-for="agent in workspaceStore.agents"
            :key="agent.id"
            class="simple-table__row"
          >
            <span class="resource-avatar"><BaseIcon name="bot" /></span>
            <span class="simple-table__primary">
              <strong>{{ agent.name }}</strong>
              <small>
                {{ workspaceStore.providerName(agent.providerId) }} ·
                {{ formatDate(agent.updatedAt) }}
              </small>
            </span>
            <span class="status-badge" :class="`status-badge--${agent.status}`">
              {{ agentStatusLabels[agent.status] }}
            </span>
            <RouterLink
              class="icon-button"
              :to="`/chat/${agent.id}`"
              aria-label="测试智能体"
            >
              <BaseIcon name="chat" />
            </RouterLink>
          </div>
        </div>
        <div v-else class="empty-state empty-state--compact">
          <p>还没有智能体，请先配置模型并创建智能体。</p>
        </div>
      </section>

      <aside class="dashboard-side">
        <section class="panel-card service-panel">
          <header class="panel-card__header">
            <div>
              <h2>服务状态</h2>
              <p>实际后端连接检查</p>
            </div>
            <span
              class="status-badge"
              :class="
                systemStatusStore.status?.status === 'ok'
                  ? 'status-badge--published'
                  : 'status-badge--disabled'
              "
            >
              {{
                systemStatusStore.status?.status === 'ok'
                  ? '运行正常'
                  : '连接异常'
              }}
            </span>
          </header>
          <div class="service-panel__body">
            <span class="service-panel__signal">
              <i></i><i></i><i></i><i></i>
            </span>
            <div>
              <strong>核心接口服务</strong>
              <p>
                {{
                  systemStatusStore.errorMessage ||
                  'NestJS 服务已连接，管理数据来自真实业务接口。'
                }}
              </p>
            </div>
          </div>
          <button
            class="secondary-button secondary-button--full"
            type="button"
            :disabled="systemStatusStore.isLoading"
            @click="systemStatusStore.refresh"
          >
            {{ systemStatusStore.isLoading ? '正在检查…' : '重新检查服务' }}
          </button>
        </section>

        <section class="panel-card quick-panel">
          <header class="panel-card__header">
            <div>
              <h2>快捷入口</h2>
              <p>常用管理操作</p>
            </div>
          </header>
          <RouterLink to="/knowledge-bases">
            <span><BaseIcon name="database" /></span>
            <div>
              <strong>添加知识资料</strong><small>支持常见文档格式</small>
            </div>
            <BaseIcon name="chevron" />
          </RouterLink>
          <RouterLink to="/model-providers">
            <span><BaseIcon name="model" /></span>
            <div>
              <strong>配置模型服务</strong><small>管理模型连接信息</small>
            </div>
            <BaseIcon name="chevron" />
          </RouterLink>
          <RouterLink to="/api-access">
            <span><BaseIcon name="api" /></span>
            <div>
              <strong>发布应用接口</strong><small>创建安全接入方式</small>
            </div>
            <BaseIcon name="chevron" />
          </RouterLink>
        </section>
      </aside>
    </div>
  </div>
</template>
