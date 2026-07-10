import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type {
  AgentSummary,
  ApiApplicationSummary,
  ConfigureProviderInput,
  CreateAgentInput,
  CreateApiApplicationInput,
  CreateKnowledgeBaseInput,
  KnowledgeBaseSummary,
  ModelProviderSummary,
} from '../domain/admin-workspace';

const today = '今天';

const initialAgents: AgentSummary[] = [
  {
    id: 'enterprise-assistant',
    name: '企业知识助手',
    description: '面向官网访客解答产品、服务和合作相关问题。',
    model: 'DeepSeek-V3',
    knowledgeBaseCount: 2,
    conversationCount: 1286,
    status: 'published',
    updatedAt: '10 分钟前',
  },
  {
    id: 'support-adviser',
    name: '售后服务顾问',
    description: '根据服务政策与产品手册提供售后问题指引。',
    model: '通义千问-Max',
    knowledgeBaseCount: 1,
    conversationCount: 438,
    status: 'draft',
    updatedAt: '昨天',
  },
  {
    id: 'investment-assistant',
    name: '招商咨询助手',
    description: '为潜在客户介绍合作模式并收集业务需求。',
    model: '豆包-Pro',
    knowledgeBaseCount: 1,
    conversationCount: 96,
    status: 'disabled',
    updatedAt: '3 天前',
  },
];

const initialKnowledgeBases: KnowledgeBaseSummary[] = [
  {
    id: 'product-library',
    name: '产品资料库',
    description: '产品说明、功能清单、解决方案与常见问题。',
    documentCount: 18,
    size: '36.8 MB',
    status: 'ready',
    updatedAt: '20 分钟前',
  },
  {
    id: 'service-library',
    name: '服务政策库',
    description: '服务流程、售后政策、交付标准与服务承诺。',
    documentCount: 9,
    size: '12.4 MB',
    status: 'ready',
    updatedAt: '昨天',
  },
  {
    id: 'process-library',
    name: '内部流程库',
    description: '业务审批、项目交付和内部协作流程。',
    documentCount: 12,
    size: '24.1 MB',
    status: 'processing',
    updatedAt: '正在处理',
  },
];

const initialProviders: ModelProviderSummary[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '适合中文推理、知识问答和复杂业务分析。',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com',
    configured: true,
    enabled: true,
  },
  {
    id: 'qwen',
    name: '通义千问',
    description: '阿里云大模型服务，覆盖多种文本与多模态模型。',
    model: 'qwen-max',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    configured: true,
    enabled: true,
  },
  {
    id: 'doubao',
    name: '豆包',
    description: '火山引擎大模型服务，适用于内容生成与问答。',
    model: 'doubao-pro',
    endpoint: '',
    configured: false,
    enabled: false,
  },
  {
    id: 'compatible',
    name: '兼容接口',
    description: '接入兼容标准对话协议的第三方或本地模型。',
    model: '',
    endpoint: '',
    configured: false,
    enabled: false,
  },
];

const initialApiApplications: ApiApplicationSummary[] = [
  {
    id: 'website-chat',
    name: '企业官网对话',
    agentName: '企业知识助手',
    endpoint: '/v1/chat/completions',
    maskedKey: 'ag_live_••••••••4f92',
    status: 'ready',
    requestCount: 3248,
    createdAt: '2026-07-08',
  },
  {
    id: 'support-mini-app',
    name: '客服小程序',
    agentName: '售后服务顾问',
    endpoint: '/v1/chat/completions',
    maskedKey: 'ag_live_••••••••91ab',
    status: 'disabled',
    requestCount: 612,
    createdAt: '2026-07-02',
  },
];

/** 管理端演示状态；后续应用服务接入后替换数据来源。 */
export const useAdminWorkspaceStore = defineStore('admin-workspace', () => {
  const agents = ref(initialAgents);
  const knowledgeBases = ref(initialKnowledgeBases);
  const modelProviders = ref(initialProviders);
  const apiApplications = ref(initialApiApplications);

  const publishedAgentCount = computed(
    () => agents.value.filter((agent) => agent.status === 'published').length,
  );
  const documentCount = computed(() =>
    knowledgeBases.value.reduce(
      (total, knowledgeBase) => total + knowledgeBase.documentCount,
      0,
    ),
  );
  const enabledProviderCount = computed(
    () => modelProviders.value.filter((provider) => provider.enabled).length,
  );
  const requestCount = computed(() =>
    apiApplications.value.reduce(
      (total, application) => total + application.requestCount,
      0,
    ),
  );

  function createAgent(input: CreateAgentInput): void {
    agents.value.unshift({
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      model: input.model,
      knowledgeBaseCount: 0,
      conversationCount: 0,
      status: 'draft',
      updatedAt: today,
    });
  }

  function createKnowledgeBase(input: CreateKnowledgeBaseInput): void {
    knowledgeBases.value.unshift({
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      documentCount: 0,
      size: '0 MB',
      status: 'ready',
      updatedAt: today,
    });
  }

  function addKnowledgeFiles(knowledgeBaseId: string, fileCount: number): void {
    const knowledgeBase = knowledgeBases.value.find(
      (item) => item.id === knowledgeBaseId,
    );

    if (!knowledgeBase) {
      return;
    }

    knowledgeBase.documentCount += fileCount;
    knowledgeBase.status = 'processing';
    knowledgeBase.updatedAt = '正在处理';
  }

  function configureProvider(input: ConfigureProviderInput): void {
    const provider = modelProviders.value.find(
      (item) => item.id === input.providerId,
    );

    if (!provider) {
      return;
    }

    provider.model = input.model;
    provider.endpoint = input.endpoint;
    provider.configured = true;
    provider.enabled = true;
  }

  function createApiApplication(input: CreateApiApplicationInput): void {
    apiApplications.value.unshift({
      id: crypto.randomUUID(),
      name: input.name,
      agentName: input.agentName,
      endpoint: '/v1/chat/completions',
      maskedKey: 'ag_live_••••••••新建',
      status: 'ready',
      requestCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    });
  }

  return {
    agents,
    apiApplications,
    createAgent,
    createApiApplication,
    createKnowledgeBase,
    addKnowledgeFiles,
    documentCount,
    enabledProviderCount,
    knowledgeBases,
    modelProviders,
    publishedAgentCount,
    requestCount,
    configureProvider,
  };
});
