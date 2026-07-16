<script setup lang="ts">
defineProps<{
  name:
    | 'activity'
    | 'alert'
    | 'api'
    | 'back'
    | 'bell'
    | 'bot'
    | 'chat'
    | 'check'
    | 'chevron'
    | 'clock'
    | 'close'
    | 'copy'
    | 'cost'
    | 'database'
    | 'document'
    | 'edit'
    | 'home'
    | 'menu'
    | 'memory'
    | 'model'
    | 'more'
    | 'office'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'settings'
    | 'skill'
    | 'trash'
    | 'upload'
    | 'user';
}>();
</script>

<template>
  <svg
    class="base-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'activity'">
      <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />
    </template>
    <template v-else-if="name === 'alert'">
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </template>
    <template v-else-if="name === 'back'">
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </template>
    <template v-else-if="name === 'home'">
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v11h14V10M9 21v-7h6v7" />
    </template>
    <template v-else-if="name === 'bot'">
      <rect x="4" y="6" width="16" height="13" rx="4" />
      <path d="M12 3v3M8.5 11h.01M15.5 11h.01M8 15h8" />
    </template>
    <template v-else-if="name === 'database'">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
    </template>
    <template v-else-if="name === 'model'">
      <path d="m12 2 8 4.5-8 4.5-8-4.5L12 2Z" />
      <path d="m4 11 8 4.5 8-4.5M4 15.5l8 4.5 8-4.5" />
    </template>
    <template v-else-if="name === 'api'">
      <path d="M8 9 4 12l4 3M16 9l4 3-4 3M14 5l-4 14" />
    </template>
    <template v-else-if="name === 'office'">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M9 21v-6h6v6" />
    </template>
    <template v-else-if="name === 'chat'">
      <path d="M5 19 3 21l.8-4A8 8 0 1 1 7 19H5Z" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </template>
    <template v-else-if="name === 'bell'">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </template>
    <template v-else-if="name === 'menu'">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="m9 18 6-6-6-6" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6l12 12M18 6 6 18" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m5 12 4 4L19 6" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </template>
    <template v-else-if="name === 'document'">
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v5h5M9 12h6M9 16h6" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
    </template>
    <template v-else-if="name === 'skill'">
      <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </template>
    <template v-else-if="name === 'upload'">
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
      />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </template>
    <template v-else-if="name === 'cost'">
      <circle cx="12" cy="12" r="9" />
      <path
        d="M15.5 8.5c-.8-.7-1.9-1-3.1-1-1.8 0-3.2.9-3.2 2.2 0 3.4 6.6 1.6 6.6 5 0 1.3-1.4 2.3-3.4 2.3-1.5 0-2.8-.5-3.7-1.3M12 5.5v13"
      />
    </template>
    <template v-else-if="name === 'more'">
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'memory'">
      <rect x="6" y="7" width="12" height="10" rx="2" />
      <path
        d="M9 10h6v4H9zM9 3v4M15 3v4M9 17v4M15 17v4M3 10h3M18 10h3M3 14h3M18 14h3"
      />
    </template>
    <template v-else-if="name === 'refresh'">
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 8a7 7 0 0 1 11.7-1L20 12M4 12l2.2 5a7 7 0 0 0 11.7-1" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </template>
  </svg>
</template>
