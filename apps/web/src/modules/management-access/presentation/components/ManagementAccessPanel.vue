<script setup lang="ts">
import { computed, ref } from 'vue';

import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';

import type { ManagementScope } from '../../domain/management-access';
import { useManagementAccessStore } from '../../stores/management-access.store';

const props = withDefaults(
  defineProps<{
    permissionMessage?: string;
    requiredAnyScopes?: ManagementScope[];
    requiredScopes?: ManagementScope[];
  }>(),
  {
    permissionMessage: '当前管理凭证缺少访问该页面所需的权限。',
    requiredAnyScopes: () => [],
    requiredScopes: () => [],
  },
);

const emit = defineEmits<{
  authenticated: [];
  loggedOut: [];
}>();

const accessStore = useManagementAccessStore();
const token = ref('');
const hasRequiredScopes = computed(
  () =>
    accessStore.hasScopes(props.requiredScopes) &&
    (props.requiredAnyScopes.length === 0 ||
      props.requiredAnyScopes.some(accessStore.hasScope)),
);
const scopeErrorMessage = computed(() =>
  accessStore.session && !hasRequiredScopes.value
    ? props.permissionMessage
    : '',
);

async function submit(): Promise<void> {
  const authenticated = await accessStore.login(token.value);

  token.value = '';

  if (authenticated && hasRequiredScopes.value) {
    emit('authenticated');
  }
}

async function retry(): Promise<void> {
  if ((await accessStore.validateSession()) && hasRequiredScopes.value) {
    emit('authenticated');
  }
}

function logout(): void {
  accessStore.logout();
  token.value = '';
  emit('loggedOut');
}
</script>

<template>
  <section class="management-access-panel" aria-live="polite">
    <div v-if="accessStore.session" class="management-access-panel__session">
      <span class="management-access-panel__icon"
        ><BaseIcon name="check"
      /></span>
      <span>
        <strong>管理会话已连接</strong>
        <small>{{ accessStore.session.subject }}</small>
      </span>
      <button
        class="secondary-button secondary-button--small"
        type="button"
        @click="logout"
      >
        退出
      </button>
    </div>

    <form v-else class="management-access-panel__form" @submit.prevent="submit">
      <div>
        <strong>管理凭证登录</strong>
        <small>凭证仅保留在当前浏览器标签页会话中。</small>
      </div>
      <label>
        <span class="visually-hidden">管理 Bearer 凭证</span>
        <input
          v-model="token"
          autocomplete="off"
          name="management-token"
          placeholder="输入管理凭证"
          spellcheck="false"
          type="password"
        />
      </label>
      <button
        class="primary-button primary-button--small"
        :disabled="accessStore.isLoading || !token.trim()"
        type="submit"
      >
        <BaseIcon name="check" />
        {{ accessStore.isLoading ? '验证中…' : '登录' }}
      </button>
      <button
        v-if="accessStore.hasCredential"
        class="secondary-button secondary-button--small"
        :disabled="accessStore.isLoading"
        type="button"
        @click="retry"
      >
        重试验证
      </button>
    </form>

    <p
      v-if="accessStore.errorMessage"
      class="management-access-panel__error"
      role="alert"
    >
      {{ accessStore.errorMessage }}
    </p>
    <p
      v-else-if="scopeErrorMessage"
      class="management-access-panel__error"
      role="alert"
    >
      {{ scopeErrorMessage }}
    </p>
  </section>
</template>
