<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';

defineProps<{
  description: string;
  title: string;
}>();

const emit = defineEmits<{
  openNavigation: [];
}>();
</script>

<template>
  <header class="admin-header">
    <div class="admin-header__title">
      <button
        class="icon-button admin-header__menu"
        type="button"
        aria-label="打开导航"
        @click="emit('openNavigation')"
      >
        <BaseIcon name="menu" />
      </button>
      <div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
    </div>
    <div class="admin-header__actions">
      <label class="admin-search">
        <BaseIcon name="search" />
        <input type="search" placeholder="搜索智能体、知识库…" />
      </label>
      <button class="icon-button has-indicator" type="button" aria-label="通知">
        <BaseIcon name="bell" />
      </button>
    </div>
  </header>
</template>
