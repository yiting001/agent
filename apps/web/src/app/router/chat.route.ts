import type { RouteRecordRaw } from 'vue-router';

export const chatRoute: RouteRecordRaw = {
  component: () =>
    import('@/modules/chat/presentation/views/AgentChatView.vue'),
  name: 'agent-chat',
  path: '/chat/:agentId?',
};
