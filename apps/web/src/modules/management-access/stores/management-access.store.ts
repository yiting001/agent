import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { applicationDependencies } from '@/app/dependencies';
import { HttpError } from '@/shared/http/http-client';

import type {
  ManagementScope,
  ManagementSession,
} from '../domain/management-access';

const gateway = applicationDependencies.managementAccessGateway;
const tokenStorage = applicationDependencies.managementTokenStorage;

function managementErrorMessage(error: unknown): string {
  if (error instanceof HttpError && error.status === 401) {
    return '管理凭证无效或已失效，请重新登录。';
  }

  if (error instanceof HttpError && error.status === 403) {
    return '该管理凭证没有访问管理会话的权限。';
  }

  return error instanceof Error ? error.message : '管理会话验证失败，请重试。';
}

export const useManagementAccessStore = defineStore('management-access', () => {
  const errorMessage = ref('');
  const errorStatus = ref<number>();
  const hasCredential = ref(tokenStorage.has());
  const isLoading = ref(false);
  const session = ref<ManagementSession>();
  let sessionVersion = 0;

  const isAuthenticated = computed(() => Boolean(session.value));

  async function validateSession(): Promise<boolean> {
    if (!tokenStorage.has()) {
      hasCredential.value = false;
      session.value = undefined;
      return false;
    }

    const requestVersion = sessionVersion;

    isLoading.value = true;
    errorMessage.value = '';
    errorStatus.value = undefined;

    try {
      const nextSession = await gateway.getSession();

      if (requestVersion !== sessionVersion || !tokenStorage.has()) {
        return false;
      }

      session.value = nextSession;
      hasCredential.value = true;
      return true;
    } catch (error) {
      if (requestVersion !== sessionVersion) {
        return false;
      }

      session.value = undefined;
      errorMessage.value = managementErrorMessage(error);
      errorStatus.value = error instanceof HttpError ? error.status : undefined;

      if (error instanceof HttpError && error.status === 401) {
        tokenStorage.clear();
        hasCredential.value = false;
      }

      return false;
    } finally {
      if (requestVersion === sessionVersion) {
        isLoading.value = false;
      }
    }
  }

  async function login(token: string): Promise<boolean> {
    sessionVersion += 1;
    tokenStorage.clear();
    errorMessage.value = '';
    errorStatus.value = undefined;
    hasCredential.value = false;
    session.value = undefined;

    try {
      tokenStorage.write(token);
      hasCredential.value = true;
    } catch (error) {
      errorMessage.value = managementErrorMessage(error);
      hasCredential.value = false;
      return false;
    }

    return validateSession();
  }

  function logout(): void {
    sessionVersion += 1;
    tokenStorage.clear();
    errorMessage.value = '';
    errorStatus.value = undefined;
    hasCredential.value = false;
    isLoading.value = false;
    session.value = undefined;
  }

  function invalidate(): void {
    sessionVersion += 1;
    tokenStorage.clear();
    errorMessage.value = '管理凭证无效或已失效，请重新登录。';
    errorStatus.value = 401;
    hasCredential.value = false;
    isLoading.value = false;
    session.value = undefined;
  }

  function hasScope(scope: ManagementScope): boolean {
    return session.value?.scopes.includes(scope) ?? false;
  }

  function hasScopes(scopes: readonly ManagementScope[]): boolean {
    return scopes.every(hasScope);
  }

  return {
    errorMessage,
    errorStatus,
    hasCredential,
    hasScope,
    hasScopes,
    isAuthenticated,
    isLoading,
    invalidate,
    login,
    logout,
    session,
    validateSession,
  };
});
