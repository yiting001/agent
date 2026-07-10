<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import AdminHeader from '../components/AdminHeader.vue';
import AdminSidebar from '../components/AdminSidebar.vue';

const route = useRoute();
const navigationOpen = ref(false);

const title = computed(() => String(route.meta.title ?? '工作台'));
const description = computed(() =>
  String(route.meta.description ?? '管理智能体平台的核心资源。'),
);
</script>

<template>
  <div class="admin-shell">
    <AdminSidebar :open="navigationOpen" @close="navigationOpen = false" />
    <section class="admin-main">
      <AdminHeader
        :description="description"
        :title="title"
        @open-navigation="navigationOpen = true"
      />
      <div class="admin-content">
        <RouterView />
      </div>
    </section>
  </div>
</template>
