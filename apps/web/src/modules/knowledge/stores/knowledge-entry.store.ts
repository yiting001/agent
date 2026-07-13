import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

import type {
  KnowledgeEntry,
  KnowledgeEntryDraft,
} from '../domain/knowledge-entry';

type RequestState = 'idle' | 'loading' | 'ready' | 'error';

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to reach the knowledge API.';
}

/** Owns list, selection and mutation state for knowledge management. */
export const useKnowledgeEntryStore = defineStore('knowledge-entries', () => {
  const gateway = applicationDependencies.knowledgeEntries;

  const entries = ref<KnowledgeEntry[]>([]);
  const requestState = ref<RequestState>('idle');
  const errorMessage = ref('');
  const isSaving = ref(false);

  const isLoading = computed(() => requestState.value === 'loading');

  async function loadEntries(): Promise<void> {
    requestState.value = 'loading';
    errorMessage.value = '';

    try {
      entries.value = await gateway.list();
      requestState.value = 'ready';
    } catch (error: unknown) {
      errorMessage.value = toErrorMessage(error);
      requestState.value = 'error';
    }
  }

  async function mutate(operation: () => Promise<void>): Promise<boolean> {
    isSaving.value = true;
    errorMessage.value = '';

    try {
      await operation();

      return true;
    } catch (error: unknown) {
      errorMessage.value = toErrorMessage(error);

      return false;
    } finally {
      isSaving.value = false;
    }
  }

  function createEntry(draft: KnowledgeEntryDraft): Promise<boolean> {
    return mutate(async () => {
      const created = await gateway.create(draft);

      entries.value = [created, ...entries.value];
    });
  }

  function updateEntry(
    id: string,
    draft: KnowledgeEntryDraft,
  ): Promise<boolean> {
    return mutate(async () => {
      const updated = await gateway.update(id, draft);

      entries.value = entries.value.map((entry) =>
        entry.id === id ? updated : entry,
      );
    });
  }

  function removeEntry(id: string): Promise<boolean> {
    return mutate(async () => {
      await gateway.remove(id);

      entries.value = entries.value.filter((entry) => entry.id !== id);
    });
  }

  return {
    createEntry,
    entries,
    errorMessage,
    isLoading,
    isSaving,
    loadEntries,
    removeEntry,
    requestState,
    updateEntry,
  };
});
