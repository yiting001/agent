<script setup lang="ts">
import { reactive, ref } from 'vue';

import type { ModelProviderSummary } from '../../domain/admin-workspace';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';

const workspaceStore = useAdminWorkspaceStore();
const selectedProvider = ref<ModelProviderSummary>();
const form = reactive({
  apiKey: '',
  endpoint: '',
  model: '',
});

function openConfiguration(provider: ModelProviderSummary): void {
  selectedProvider.value = provider;
  form.apiKey = '';
  form.endpoint = provider.endpoint;
  form.model = provider.model;
}

function saveConfiguration(): void {
  if (
    !selectedProvider.value ||
    !form.apiKey.trim() ||
    !form.endpoint.trim() ||
    !form.model.trim()
  ) {
    return;
  }

  workspaceStore.configureProvider({
    endpoint: form.endpoint.trim(),
    model: form.model.trim(),
    providerId: selectedProvider.value.id,
  });
  form.apiKey = '';
  selectedProvider.value = undefined;
}
</script>

<template>
  <div class="admin-page">
    <section class="model-security-note">
      <span><BaseIcon name="check" /></span>
      <div>
        <strong>模型密钥由后端安全保存</strong>
        <p>前端只提交配置，不回显完整密钥，也不会把密钥写入浏览器存储。</p>
      </div>
    </section>

    <section class="provider-grid">
      <article
        v-for="provider in workspaceStore.modelProviders"
        :key="provider.id"
        class="provider-card"
        :class="{ 'provider-card--configured': provider.configured }"
      >
        <header>
          <span class="provider-card__logo">
            {{ provider.name.slice(0, 1) }}
          </span>
          <span
            class="status-badge"
            :class="
              provider.enabled
                ? 'status-badge--published'
                : 'status-badge--draft'
            "
          >
            {{ provider.enabled ? '已启用' : '未配置' }}
          </span>
        </header>
        <div>
          <h2>{{ provider.name }}</h2>
          <p>{{ provider.description }}</p>
        </div>
        <dl>
          <div>
            <dt>当前模型</dt>
            <dd>{{ provider.model || '尚未设置' }}</dd>
          </div>
          <div>
            <dt>服务地址</dt>
            <dd>{{ provider.endpoint || '尚未设置' }}</dd>
          </div>
        </dl>
        <button
          class="secondary-button secondary-button--full"
          type="button"
          @click="openConfiguration(provider)"
        >
          <BaseIcon name="settings" />
          {{ provider.configured ? '修改配置' : '立即配置' }}
        </button>
      </article>
    </section>

    <section class="panel-card model-routing">
      <header class="panel-card__header">
        <div>
          <h2>模型使用原则</h2>
          <p>每个智能体单独选择模型，便于按场景控制效果与成本。</p>
        </div>
      </header>
      <div class="model-routing__grid">
        <div>
          <span><BaseIcon name="bot" /></span>
          <strong>智能体级配置</strong>
          <p>不同智能体可以使用不同模型和参数。</p>
        </div>
        <div>
          <span><BaseIcon name="check" /></span>
          <strong>连接状态检查</strong>
          <p>保存前由后端验证服务地址和密钥是否有效。</p>
        </div>
        <div>
          <span><BaseIcon name="api" /></span>
          <strong>统一模型适配</strong>
          <p>业务层不直接依赖具体模型平台的调用方式。</p>
        </div>
      </div>
    </section>

    <BaseModal
      :open="Boolean(selectedProvider)"
      :title="`配置${selectedProvider?.name ?? '模型服务'}`"
      description="配置信息提交后由后端验证和保存。"
      @close="selectedProvider = undefined"
    >
      <form class="admin-form" @submit.prevent="saveConfiguration">
        <label>
          <span>服务地址</span>
          <input
            v-model="form.endpoint"
            type="url"
            placeholder="请输入模型服务地址"
            required
          />
        </label>
        <label>
          <span>模型名称</span>
          <input
            v-model="form.model"
            type="text"
            placeholder="请输入调用使用的模型名称"
            required
          />
        </label>
        <label>
          <span>访问密钥</span>
          <input
            v-model="form.apiKey"
            type="password"
            autocomplete="new-password"
            placeholder="输入后不会在前端再次显示"
            required
          />
          <small>演示页面不会持久化此字段。</small>
        </label>
        <div class="form-actions">
          <button
            class="secondary-button"
            type="button"
            @click="selectedProvider = undefined"
          >
            取消
          </button>
          <button class="primary-button" type="submit">验证并保存</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
