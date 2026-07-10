<script setup lang="ts">
import type { SystemStatus } from '../../domain/system-status';

defineProps<{
  errorMessage: string;
  isLoading: boolean;
  status?: SystemStatus;
}>();

const emit = defineEmits<{
  refresh: [];
}>();
</script>

<template>
  <section class="status-card" aria-live="polite">
    <div class="status-card__heading">
      <div>
        <p class="eyebrow">Runtime connection</p>
        <h2>API status</h2>
      </div>
      <span
        class="status-indicator"
        :class="{ 'status-indicator--online': status?.status === 'ok' }"
      >
        {{ status?.status === 'ok' ? 'Online' : 'Unavailable' }}
      </span>
    </div>

    <dl v-if="status" class="status-grid">
      <div>
        <dt>Service</dt>
        <dd>{{ status.service }}</dd>
      </div>
      <div>
        <dt>Checked at</dt>
        <dd>{{ new Date(status.timestamp).toLocaleString() }}</dd>
      </div>
    </dl>

    <p v-else-if="errorMessage" class="status-error">{{ errorMessage }}</p>
    <p v-else class="status-placeholder">
      Check the NestJS API connection to view its current state.
    </p>

    <button type="button" :disabled="isLoading" @click="emit('refresh')">
      {{ isLoading ? 'Checking…' : 'Check connection' }}
    </button>
  </section>
</template>
