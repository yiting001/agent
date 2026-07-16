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
        import('@/modules/admin/presentation/views/SkillsManagementView.vue'),
      meta: {
        description: '安装提示词技能与 MCP 工具，扩展智能体能力。',
        title: '技能管理',
      },
      name: 'skills-management',
      path: 'skills',
    },
    {
      component: () =>
        import(
          '@/modules/prompt-policies/presentation/views/PromptPoliciesView.vue'
        ),
      meta: {
        description: '管理控制智能体输出格式与行为的内置系统提示词。',
        title: '提示词管理',
      },
      name: 'prompt-policies',
      path: 'prompt-policies',
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
    {
      component: () =>
        import(
          '@/modules/observability/presentation/views/ObservabilityView.vue'
        ),
      meta: {
        description: '查看执行链路、性能、模型成本和异常告警。',
        title: '观测与监控',
      },
      name: 'observability',
      path: 'observability',
    },
    {
      component: () =>
        import('@/modules/evaluation/presentation/views/EvaluationView.vue'),
      meta: {
        description: '定义评估指标、测试用例和基准运行，持续验证智能体表现。',
        title: '评估与测试',
      },
      name: 'evaluation',
      path: 'evaluation',
    },
    {
      component: () =>
        import('@/modules/office/presentation/views/OfficeView.vue'),
      meta: {
        description: '查看团队成员的实时状态与协作流转。',
        title: '智能办公室',
      },
      name: 'office',
      path: 'office',
    },
    {
      component: () =>
        import('@/modules/admin/presentation/views/BrandSettingsView.vue'),
      meta: {
        description: '统一设置管理端与用户对话页面的软件名称和图标。',
        title: '系统设置',
      },
      name: 'brand-settings',
      path: 'settings',
    },
  ],
};
