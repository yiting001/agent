<script setup lang="ts">
import { onMounted, watchEffect } from 'vue';
import { useRoute } from 'vue-router';

import { useBrandSettingsStore } from '@/modules/branding/stores/brand-settings.store';

const route = useRoute();
const brandStore = useBrandSettingsStore();

onMounted(() => brandStore.initialize());

watchEffect(() => {
  const pageTitle = route.meta.title ? `${String(route.meta.title)} - ` : '';

  document.title = `${pageTitle}${brandStore.softwareName}`;

  const existingIcon = document.querySelector<HTMLLinkElement>(
    'link[data-brand-icon]',
  );

  if (!brandStore.iconUrl) {
    existingIcon?.remove();
    return;
  }

  const icon = existingIcon ?? document.createElement('link');

  icon.dataset.brandIcon = '';
  icon.rel = 'icon';
  icon.href = brandStore.iconUrl;

  if (!existingIcon) {
    document.head.append(icon);
  }
});
</script>

<template>
  <RouterView />
</template>
