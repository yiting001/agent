<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';

defineProps<{
  description: string;
  open: boolean;
  title: string;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <section class="modal-card" role="dialog" aria-modal="true">
        <header class="modal-card__header">
          <div>
            <h2>{{ title }}</h2>
            <p>{{ description }}</p>
          </div>
          <button
            class="icon-button"
            type="button"
            aria-label="关闭"
            @click="emit('close')"
          >
            <BaseIcon name="close" />
          </button>
        </header>
        <div class="modal-card__content">
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>
