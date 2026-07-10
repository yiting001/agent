<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import AdminHeader from '../components/AdminHeader.vue';
import AdminSidebar from '../components/AdminSidebar.vue';

const route = useRoute();
const workspaceStore = useAdminWorkspaceStore();
const navigationOpen = ref(false);

const title = computed(() => String(route.meta.title ?? '工作台'));
const description = computed(() =>
  String(route.meta.description ?? '管理智能体平台的核心资源。'),
);

onMounted(() => workspaceStore.initialize());
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
        <div v-if="workspaceStore.errorMessage" class="admin-error">
          {{ workspaceStore.errorMessage }}
          <button type="button" @click="workspaceStore.initialize">
            重新加载
          </button>
        </div>
        <RouterView />
      </div>
    </section>
  </div>
</template>
