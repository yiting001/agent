import type { RouteRecordRaw } from 'vue-router';

/** 富文本渲染模块的演示路由。 */
export const richContentRoute: RouteRecordRaw = {
  component: () =>
    import('@/modules/rich-content/presentation/views/RichContentDemoView.vue'),
  name: 'rich-content-demo',
  path: '/rich-content',
};
