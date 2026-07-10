import type { RouteRecordRaw } from 'vue-router';

/** Root route for the system overview module. */
export const homeRoute: RouteRecordRaw = {
  component: () =>
    import('@/modules/system/presentation/views/SystemHomeView.vue'),
  name: 'system-home',
  path: '/',
};
