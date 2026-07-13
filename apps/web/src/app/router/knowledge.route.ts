import type { RouteRecordRaw } from 'vue-router';

/** Route for the knowledge base management module. */
export const knowledgeRoute: RouteRecordRaw = {
  component: () =>
    import(
      '@/modules/knowledge/presentation/views/KnowledgeManagementView.vue'
    ),
  name: 'knowledge-management',
  path: '/knowledge',
};
