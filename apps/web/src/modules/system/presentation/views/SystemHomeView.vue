<script setup lang="ts">
import { onMounted } from 'vue';

import SystemStatusCard from '../components/SystemStatusCard.vue';
import { useSystemStatusStore } from '../../stores/system-status.store';

const systemStatusStore = useSystemStatusStore();

onMounted(() => systemStatusStore.refresh());
</script>

<template>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Agent workspace</p>
      <h1>Simple boundaries.<br />Clear responsibilities.</h1>
      <p class="hero__summary">
        A focused foundation for business modules built with NestJS, SQLite, Vue
        3 and Pinia.
      </p>
    </section>

    <SystemStatusCard
      :error-message="systemStatusStore.errorMessage"
      :is-loading="systemStatusStore.isLoading"
      :status="systemStatusStore.status"
      @refresh="systemStatusStore.refresh"
    />
  </main>
</template>
