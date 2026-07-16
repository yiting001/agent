<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';
import BaseModal from '@/modules/admin/presentation/components/BaseModal.vue';
import { formatDate } from '@/modules/admin/presentation/admin-display';

import type {
  PromptPolicy,
  PromptPolicyCategory,
} from '../../domain/prompt-policy';
import { usePromptPolicyStore } from '../../stores/prompt-policy.store';

const categoryLabels: Record<PromptPolicyCategory, string> = {
  behavior: '行为规范',
  output: '输出规范',
  safety: '安全规范',
};
const store = usePromptPolicyStore();
const searchTerm = ref('');
const editingId = ref('');
const validationMessage = ref('');
const form = reactive({
  content: '',
  description: '',
  enabled: true,
  expectedRevision: 1,
  name: '',
  priority: 100,
});

const filteredPolicies = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();

  return query
    ? store.policies.filter(
        (policy) =>
          policy.name.toLowerCase().includes(query) ||
          policy.description.toLowerCase().includes(query) ||
          policy.key.toLowerCase().includes(query),
      )
    : store.policies;
});
const editingPolicy = computed(() =>
  store.policies.find((policy) => policy.id === editingId.value),
);

onMounted(() => store.load());

function openEditor(policy: PromptPolicy): void {
  editingId.value = policy.id;
  validationMessage.value = '';
  form.content = policy.content;
  form.description = policy.description;
  form.enabled = policy.enabled;
  form.expectedRevision = policy.revision;
  form.name = policy.name;
  form.priority = policy.priority;
}

function closeEditor(): void {
  editingId.value = '';
  validationMessage.value = '';
}

function validateForm(): boolean {
  if (!form.name.trim() || !form.content.trim()) {
    validationMessage.value = '名称和提示词内容不能为空。';
    return false;
  }

  if (
    !Number.isInteger(form.priority) ||
    form.priority < 0 ||
    form.priority > 1_000
  ) {
    validationMessage.value = '优先级必须是 0 到 1000 之间的整数。';
    return false;
  }

  validationMessage.value = '';
  return true;
}

async function savePolicy(): Promise<void> {
  if (!editingPolicy.value || !validateForm()) {
    return;
  }

  try {
    await store.update(editingPolicy.value.id, {
      content: form.content.trim(),
      description: form.description.trim(),
      enabled: form.enabled,
      expectedRevision: form.expectedRevision,
      name: form.name.trim(),
      priority: form.priority,
    });
    closeEditor();
  } catch {
    return;
  }
}

async function togglePolicy(policy: PromptPolicy): Promise<void> {
  try {
    await store.update(policy.id, {
      content: policy.content,
      description: policy.description,
      enabled: !policy.enabled,
      expectedRevision: policy.revision,
      name: policy.name,
      priority: policy.priority,
    });
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
          placeholder="搜索提示词名称或 key…"
        />
      </label>
      <div class="page-toolbar__actions">
        <button
          class="secondary-button"
          type="button"
          :disabled="store.isLoading"
          @click="store.load"
        >
          <BaseIcon name="refresh" />
          {{ store.isLoading ? '加载中…' : '重新加载' }}
        </button>
      </div>
    </section>

    <div v-if="store.error" class="admin-error" role="alert">
      {{ store.error }}
      <button type="button" @click="store.load">重试</button>
    </div>
    <p v-if="store.successMessage" class="prompt-policy-success" role="status">
      {{ store.successMessage }}
    </p>

    <section
      v-if="store.isLoading && !store.policies.length"
      class="empty-state"
    >
      <BaseIcon name="refresh" />
      <h2>正在加载内置提示词</h2>
      <p>正在读取控制智能体输出格式与行为的系统策略。</p>
    </section>

    <section v-else-if="filteredPolicies.length" class="prompt-policy-grid">
      <article
        v-for="policy in filteredPolicies"
        :key="policy.id"
        class="prompt-policy-card"
      >
        <header>
          <span class="resource-avatar resource-avatar--large">
            <BaseIcon name="document" />
          </span>
          <div>
            <code>{{ policy.key }}</code>
            <h2>{{ policy.name }}</h2>
          </div>
          <span
            class="status-badge"
            :class="
              policy.enabled
                ? 'status-badge--published'
                : 'status-badge--disabled'
            "
          >
            {{ policy.enabled ? '已启用' : '已停用' }}
          </span>
        </header>
        <p class="prompt-policy-card__description">
          {{ policy.description || '暂无描述' }}
        </p>
        <pre class="prompt-policy-card__preview">{{ policy.content }}</pre>
        <dl>
          <div>
            <dt>分类</dt>
            <dd>{{ categoryLabels[policy.category] }}</dd>
          </div>
          <div>
            <dt>优先级</dt>
            <dd>{{ policy.priority }}</dd>
          </div>
          <div>
            <dt>版本</dt>
            <dd>v{{ policy.revision }}</dd>
          </div>
          <div>
            <dt>来源</dt>
            <dd>系统内置</dd>
          </div>
        </dl>
        <footer>
          <span>更新于 {{ formatDate(policy.updatedAt) }}</span>
          <div>
            <button
              class="text-button"
              type="button"
              :disabled="store.savingId === policy.id"
              @click="togglePolicy(policy)"
            >
              {{ policy.enabled ? '停用' : '启用' }}
            </button>
            <button
              class="secondary-button secondary-button--small"
              type="button"
              :disabled="store.savingId === policy.id"
              @click="openEditor(policy)"
            >
              编辑
            </button>
          </div>
        </footer>
      </article>
    </section>

    <section v-else-if="!store.isLoading" class="empty-state">
      <BaseIcon name="document" />
      <h2>没有可管理的内置提示词</h2>
      <p>系统内置提示词由数据库 migration 安装，不支持从页面删除。</p>
      <button class="primary-button" type="button" @click="store.load">
        重新加载
      </button>
    </section>

    <BaseModal
      :open="Boolean(editingPolicy)"
      title="编辑内置提示词"
      description="修改将在下一次对话中生效；系统使用版本号防止并发覆盖。"
      wide
      @close="closeEditor"
    >
      <form class="admin-form" @submit.prevent="savePolicy">
        <label>
          <span>提示词名称</span>
          <input v-model="form.name" maxlength="80" required />
        </label>
        <label>
          <span>功能描述</span>
          <textarea
            v-model="form.description"
            rows="2"
            maxlength="240"
          ></textarea>
        </label>
        <label>
          <span>注入优先级（数值越小越靠前）</span>
          <input
            v-model.number="form.priority"
            type="number"
            min="0"
            max="1000"
            step="1"
            required
          />
        </label>
        <label class="prompt-policy-enabled">
          <input v-model="form.enabled" type="checkbox" />
          <span>启用此系统策略</span>
        </label>
        <label>
          <span>提示词内容</span>
          <textarea
            v-model="form.content"
            class="prompt-policy-editor"
            rows="16"
            maxlength="20000"
            required
          ></textarea>
          <small>{{ form.content.length }} / 20000 字符</small>
        </label>
        <p
          v-if="validationMessage || store.error"
          class="form-error"
          role="alert"
        >
          {{ validationMessage || store.error }}
        </p>
        <div class="form-actions">
          <button class="secondary-button" type="button" @click="closeEditor">
            取消
          </button>
          <button
            class="primary-button"
            type="submit"
            :disabled="store.savingId === editingPolicy?.id"
          >
            {{
              store.savingId === editingPolicy?.id ? '正在保存…' : '保存修改'
            }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
