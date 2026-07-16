import { defineStore } from 'pinia';
import { ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

import type {
  PromptPolicy,
  UpdatePromptPolicyInput,
} from '../domain/prompt-policy';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '提示词操作失败，请重试。';
}

/** 管理提示词列表、保存状态和可重试错误。 */
export const usePromptPolicyStore = defineStore('prompt-policies', () => {
  const policies = ref<PromptPolicy[]>([]);
  const isLoading = ref(false);
  const savingId = ref('');
  const error = ref('');
  const successMessage = ref('');

  async function load(): Promise<void> {
    isLoading.value = true;
    error.value = '';
    successMessage.value = '';

    try {
      policies.value = await applicationDependencies.promptPolicyGateway.list();
    } catch (cause) {
      error.value = errorMessage(cause);
    } finally {
      isLoading.value = false;
    }
  }

  async function update(
    id: string,
    input: UpdatePromptPolicyInput,
  ): Promise<PromptPolicy> {
    savingId.value = id;
    error.value = '';
    successMessage.value = '';

    try {
      const updated = await applicationDependencies.promptPolicyGateway.update(
        id,
        input,
      );
      const index = policies.value.findIndex((policy) => policy.id === id);

      if (index >= 0) {
        policies.value[index] = updated;
      }

      successMessage.value = '提示词已保存并将在下一次对话中生效。';
      return updated;
    } catch (cause) {
      error.value = errorMessage(cause);
      throw cause;
    } finally {
      savingId.value = '';
    }
  }

  return {
    error,
    isLoading,
    load,
    policies,
    savingId,
    successMessage,
    update,
  };
});
