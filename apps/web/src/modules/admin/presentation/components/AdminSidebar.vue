<script setup lang="ts">
import { computed } from 'vue';

import { useBrandSettingsStore } from '@/modules/branding/stores/brand-settings.store';

import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import BaseIcon from './BaseIcon.vue';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();
const workspaceStore = useAdminWorkspaceStore();
const brandStore = useBrandSettingsStore();
const testRoute = computed(() =>
  workspaceStore.agents[0] ? `/chat/${workspaceStore.agents[0].id}` : '/agents',
);

const navigation = [
  { icon: 'home' as const, label: '工作台', to: '/' },
  { icon: 'bot' as const, label: '智能体管理', to: '/agents' },
  { icon: 'database' as const, label: '知识库管理', to: '/knowledge-bases' },
  { icon: 'skill' as const, label: '技能管理', to: '/skills' },
  { icon: 'model' as const, label: '模型配置', to: '/model-providers' },
  { icon: 'api' as const, label: 'API 管理', to: '/api-access' },
  { icon: 'activity' as const, label: '观测与监控', to: '/observability' },
  { icon: 'check' as const, label: '评估与测试', to: '/evaluation' },
  { icon: 'settings' as const, label: '系统设置', to: '/settings' },
];
</script>

<template>
  <aside class="admin-sidebar" :class="{ 'is-open': open }">
    <div class="admin-sidebar__brand">
      <RouterLink class="admin-brand" to="/" @click="emit('close')">
        <span class="admin-brand__mark">
          <img v-if="brandStore.iconUrl" :src="brandStore.iconUrl" alt="" />
          <BaseIcon v-else name="bot" />
        </span>
        <span
          ><strong>{{ brandStore.softwareName }}</strong
          ><small>管理控制台</small></span
        >
      </RouterLink>
      <button
        class="icon-button admin-sidebar__close"
        type="button"
        aria-label="关闭导航"
        @click="emit('close')"
      >
        <BaseIcon name="close" />
      </button>
    </div>

    <nav class="admin-navigation" aria-label="后台主导航">
      <p class="admin-navigation__label">管理菜单</p>
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        class="admin-navigation__item"
        @click="emit('close')"
      >
        <BaseIcon :name="item.icon" />
        <span>{{ item.label }}</span>
        <BaseIcon class="admin-navigation__arrow" name="chevron" />
      </RouterLink>
    </nav>

    <div class="admin-sidebar__tester">
      <span class="admin-sidebar__tester-icon"><BaseIcon name="chat" /></span>
      <div>
        <strong>测试智能体</strong>
        <p>以最终用户视角进行对话测试。</p>
      </div>
      <RouterLink class="text-link" :to="testRoute"> 进入测试页 </RouterLink>
    </div>

    <div class="admin-sidebar__account">
      <span class="admin-avatar">管</span>
      <span><strong>管理员</strong><small>系统管理账号</small></span>
      <button class="icon-button" type="button" aria-label="账号菜单">
        <BaseIcon name="more" />
      </button>
    </div>
  </aside>
  <button
    v-if="open"
    class="admin-sidebar-mask"
    type="button"
    aria-label="关闭导航"
    @click="emit('close')"
  ></button>
</template>
