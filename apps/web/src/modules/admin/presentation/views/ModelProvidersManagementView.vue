<script setup lang="ts">
import { reactive, ref } from 'vue';

import type { ModelProviderSummary } from '../../domain/admin-workspace';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';

const workspaceStore = useAdminWorkspaceStore();
const modalOpen = ref(false);
const selectedProvider = ref<ModelProviderSummary>();
const form = reactive({
  apiKey: '',
  baseUrl: '',
  chatModel: '',
  description: '',
  embeddingDimensions: '' as number | '',
  embeddingModel: '',
  key: '',
  name: '',
});

function openConfiguration(provider?: ModelProviderSummary): void {
  selectedProvider.value = provider;
  form.apiKey = '';
  form.baseUrl = provider?.baseUrl ?? '';
  form.chatModel = provider?.chatModel ?? '';
  form.description = provider?.description ?? '';
  form.embeddingDimensions = provider?.embeddingDimensions ?? '';
  form.embeddingModel = provider?.embeddingModel ?? '';
  form.key = provider?.key ?? '';
  form.name = provider?.name ?? '';
  modalOpen.value = true;
}

async function saveConfiguration(): Promise<void> {
  if (
    !form.apiKey.trim() ||
    !form.baseUrl.trim() ||
    !form.description.trim() ||
    !form.key.trim() ||
    !form.name.trim() ||
    (!form.chatModel.trim() && !form.embeddingModel.trim())
  ) {
    return;
  }

  try {
    await workspaceStore.configureProvider({
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim(),
      chatModel: form.chatModel.trim() || undefined,
      description: form.description.trim(),
      embeddingDimensions:
        form.embeddingModel.trim() &&
        typeof form.embeddingDimensions === 'number' &&
        form.embeddingDimensions > 0
          ? form.embeddingDimensions
          : undefined,
      embeddingModel: form.embeddingModel.trim() || undefined,
      key: form.key.trim().toLowerCase(),
      name: form.name.trim(),
    });
    form.apiKey = '';
    modalOpen.value = false;
  } catch {
    return;
  }
}
</script>

<template>
  <div class="admin-page">
    <section class="model-security-note">
      <span><BaseIcon name="check" /></span>
      <div>
        <strong>模型密钥由后端加密保存</strong>
        <p>保存时会真实验证服务地址与密钥，前端不会回显或持久化密钥。</p>
      </div>
      <button class="primary-button" type="button" @click="openConfiguration()">
        <BaseIcon name="plus" />
        接入模型服务
      </button>
    </section>

    <section v-if="workspaceStore.modelProviders.length" class="provider-grid">
      <article
        v-for="provider in workspaceStore.modelProviders"
        :key="provider.id"
        class="provider-card"
        :class="{ 'provider-card--configured': provider.configured }"
      >
        <header>
          <span class="provider-card__logo">{{
            provider.name.slice(0, 1)
          }}</span>
          <span
            class="status-badge"
            :class="
              provider.enabled
                ? 'status-badge--published'
                : 'status-badge--draft'
            "
          >
            {{ provider.enabled ? '已启用' : '已停用' }}
          </span>
        </header>
        <div>
          <h2>{{ provider.name }}</h2>
          <p>{{ provider.description }}</p>
        </div>
        <dl>
          <div>
            <dt>对话模型</dt>
            <dd>{{ provider.chatModel || '未配置' }}</dd>
          </div>
          <div>
            <dt>嵌入模型</dt>
            <dd>
              {{ provider.embeddingModel || '未配置' }}
              <small v-if="provider.embeddingDimensions">
                · {{ provider.embeddingDimensions }} 维
              </small>
            </dd>
          </div>
          <div>
            <dt>服务地址</dt>
            <dd>{{ provider.baseUrl }}</dd>
          </div>
        </dl>
        <button
          class="secondary-button secondary-button--full"
          type="button"
          @click="openConfiguration(provider)"
        >
          <BaseIcon name="settings" />
          修改并重新验证
        </button>
      </article>
    </section>

    <section v-else-if="!workspaceStore.isLoading" class="empty-state">
      <BaseIcon name="model" />
      <h2>还没有接入模型</h2>
      <p>支持 DeepSeek、通义千问、豆包及其他 OpenAI 兼容服务。</p>
      <button class="primary-button" type="button" @click="openConfiguration()">
        接入第一个模型
      </button>
    </section>

    <section class="panel-card model-routing">
      <header class="panel-card__header">
        <div>
          <h2>统一模型适配</h2>
          <p>同一个服务可同时配置对话模型和嵌入模型。</p>
        </div>
      </header>
      <div class="model-routing__grid">
        <div>
          <span><BaseIcon name="bot" /></span>
          <strong>对话生成</strong>
          <p>智能体通过所选对话模型生成真实回答。</p>
        </div>
        <div>
          <span><BaseIcon name="database" /></span>
          <strong>知识向量化</strong>
          <p>嵌入模型将文档切片写入本地持久化的 Zvec 向量索引。</p>
        </div>
        <div>
          <span><BaseIcon name="check" /></span>
          <strong>保存前验证</strong>
          <p>后端调用模型服务验证密钥，失败时不会保存。</p>
        </div>
      </div>
    </section>

    <BaseModal
      :open="modalOpen"
      :title="
        selectedProvider ? `配置${selectedProvider.name}` : '接入模型服务'
      "
      description="适用于支持 OpenAI 标准接口的云模型或本地模型服务。"
      @close="modalOpen = false"
    >
      <form class="admin-form" @submit.prevent="saveConfiguration">
        <label>
          <span>服务标识</span>
          <input
            v-model="form.key"
            pattern="[a-z0-9_-]+"
            placeholder="例如 deepseek"
            :disabled="Boolean(selectedProvider)"
            required
          />
        </label>
        <label>
          <span>显示名称</span>
          <input
            v-model="form.name"
            maxlength="80"
            placeholder="例如 DeepSeek"
            required
          />
        </label>
        <label>
          <span>用途说明</span>
          <textarea
            v-model="form.description"
            rows="2"
            maxlength="240"
            required
          ></textarea>
        </label>
        <label>
          <span>服务地址</span>
          <input
            v-model="form.baseUrl"
            type="url"
            placeholder="https://api.example.com/v1"
            required
          />
        </label>
        <label>
          <span>对话模型（可选）</span>
          <input v-model="form.chatModel" placeholder="例如 deepseek-chat" />
        </label>
        <label>
          <span>嵌入模型（知识库需要）</span>
          <input
            v-model="form.embeddingModel"
            placeholder="例如 text-embedding-3-small"
          />
        </label>
        <label v-if="form.embeddingModel">
          <span>向量维度（可选）</span>
          <input
            v-model.number="form.embeddingDimensions"
            type="number"
            min="1"
            max="65536"
            placeholder="留空由后端自动检测"
          />
          <small>保存时会调用嵌入接口并记录模型实际返回的维度。</small>
        </label>
        <label>
          <span>访问密钥</span>
          <input
            v-model="form.apiKey"
            type="password"
            autocomplete="new-password"
            maxlength="200"
            required
          />
          <small>密钥仅提交一次；修改配置时需要重新输入。</small>
        </label>
        <div class="form-actions">
          <button
            class="secondary-button"
            type="button"
            @click="modalOpen = false"
          >
            取消
          </button>
          <button
            class="primary-button"
            type="submit"
            :disabled="workspaceStore.isSaving"
          >
            {{ workspaceStore.isSaving ? '正在验证…' : '验证并保存' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
