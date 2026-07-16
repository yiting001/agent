<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';

defineProps<{
  description: string;
  flush?: boolean;
  open: boolean;
  title: string;
  wide?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <section
        class="modal-card"
        :class="{ 'modal-card--wide': wide }"
        role="dialog"
        aria-modal="true"
      >
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
        <div
          class="modal-card__content"
          :class="{ 'modal-card__content--flush': flush }"
        >
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>
