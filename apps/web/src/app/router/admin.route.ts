import type { RouteRecordRaw } from 'vue-router';

export const adminRoute: RouteRecordRaw = {
  component: () =>
    import('@/modules/admin/presentation/layouts/AdminLayout.vue'),
  path: '/',
  children: [
    {
      component: () =>
        import('@/modules/admin/presentation/views/AdminDashboardView.vue'),
      meta: {
        description: '掌握智能体、知识库、模型和接口的运行情况。',
        title: '工作台',
      },
      name: 'admin-dashboard',
      path: '',
    },
    {
      component: () =>
        import('@/modules/admin/presentation/views/AgentsManagementView.vue'),
      meta: {
        description: '创建、配置、发布并测试面向不同场景的智能体。',
        title: '智能体管理',
      },
      name: 'agents-management',
      path: 'agents',
    },
    {
      component: () =>
        import(
          '@/modules/admin/presentation/views/KnowledgeBasesManagementView.vue'
        ),
      meta: {
        description: '统一管理文档资料、解析状态与知识库内容。',
        title: '知识库管理',
      },
      name: 'knowledge-bases-management',
      path: 'knowledge-bases',
    },
    {
      component: () =>
        import(
          '@/modules/admin/presentation/views/ModelProvidersManagementView.vue'
        ),
      meta: {
        description: '配置 DeepSeek、通义千问、豆包及兼容模型服务。',
        title: '模型配置',
      },
      name: 'model-providers-management',
      path: 'model-providers',
    },
    {
      component: () =>
        import(
          '@/modules/admin/presentation/views/ApiAccessManagementView.vue'
        ),
      meta: {
        description: '为已发布智能体创建受控的应用接入方式。',
        title: 'API 管理',
      },
      name: 'api-access-management',
      path: 'api-access',
    },
  ],
};
