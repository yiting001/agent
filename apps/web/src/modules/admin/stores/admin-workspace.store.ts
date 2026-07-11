import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

import type {
  AgentStatus,
  AgentSummary,
  ApiApplicationSummary,
  ConfigureProviderInput,
  ConversationMessage,
  CreateAgentInput,
  CreateApiApplicationInput,
  CreateKnowledgeBaseInput,
  CreateKnowledgeModuleInput,
  KnowledgeBaseSummary,
  ModelProviderSummary,
} from '../domain/admin-workspace';

const gateway = applicationDependencies.adminWorkspaceGateway;

function replaceById<Resource extends { id: string }>(
  resources: Resource[],
  replacement: Resource,
): Resource[] {
  const exists = resources.some((resource) => resource.id === replacement.id);

  return exists
    ? resources.map((resource) =>
        resource.id === replacement.id ? replacement : resource,
      )
    : [replacement, ...resources];
}

export const useAdminWorkspaceStore = defineStore('admin-workspace', () => {
  const agents = ref<AgentSummary[]>([]);
  const knowledgeBases = ref<KnowledgeBaseSummary[]>([]);
  const modelProviders = ref<ModelProviderSummary[]>([]);
  const apiApplications = ref<ApiApplicationSummary[]>([]);
  const errorMessage = ref('');
  const isLoading = ref(false);
  const isSaving = ref(false);
  const uploadProgress = ref<Record<string, number>>({});
  const latestSecretKey = ref('');
  let refreshingKnowledgeBases = false;

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

  async function execute<Output>(
    operation: () => Promise<Output>,
  ): Promise<Output> {
    errorMessage.value = '';
    isSaving.value = true;

    try {
      return await operation();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '操作失败，请稍后重试。';
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  async function initialize(): Promise<void> {
    if (isLoading.value) {
      return;
    }

    isLoading.value = true;
    errorMessage.value = '';

    try {
      [
        agents.value,
        knowledgeBases.value,
        modelProviders.value,
        apiApplications.value,
      ] = await Promise.all([
        gateway.listAgents(),
        gateway.listKnowledgeBases(),
        gateway.listModelProviders(),
        gateway.listApiApplications(),
      ]);
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '管理数据加载失败。';
    } finally {
      isLoading.value = false;
    }
  }

  async function createAgent(input: CreateAgentInput): Promise<void> {
    const created = await execute(() => gateway.createAgent(input));

    agents.value.unshift(created);
  }

  async function updateAgent(
    agentId: string,
    input: CreateAgentInput,
  ): Promise<void> {
    const updated = await execute(() => gateway.updateAgent(agentId, input));

    agents.value = replaceById(agents.value, updated);
  }

  async function deleteAgent(agentId: string): Promise<void> {
    await execute(() => gateway.deleteAgent(agentId));

    agents.value = agents.value.filter((agent) => agent.id !== agentId);
  }

  async function updateAgentStatus(
    agentId: string,
    status: AgentStatus,
  ): Promise<void> {
    const updated = await execute(() =>
      gateway.updateAgentStatus(agentId, status),
    );

    agents.value = replaceById(agents.value, updated);
  }

  async function createKnowledgeBase(
    input: CreateKnowledgeBaseInput,
  ): Promise<void> {
    const created = await execute(() => gateway.createKnowledgeBase(input));

    knowledgeBases.value.unshift(created);
  }

  async function createKnowledgeModule(
    input: CreateKnowledgeModuleInput,
  ): Promise<void> {
    const created = await execute(() => gateway.createKnowledgeModule(input));
    const knowledgeBase = knowledgeBases.value.find(
      (item) => item.id === input.knowledgeBaseId,
    );

    if (knowledgeBase) {
      knowledgeBase.modules.push(created);
    }
  }

  async function refreshKnowledgeBases(): Promise<void> {
    if (refreshingKnowledgeBases) {
      return;
    }

    refreshingKnowledgeBases = true;

    try {
      knowledgeBases.value = await gateway.listKnowledgeBases();
      errorMessage.value = '';
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '知识库状态刷新失败。';
    } finally {
      refreshingKnowledgeBases = false;
    }
  }

  async function uploadKnowledgeFile(
    moduleId: string,
    file: File,
  ): Promise<void> {
    uploadProgress.value[moduleId] = 0;

    try {
      await execute(() =>
        gateway.uploadKnowledgeFile(moduleId, file, (progress) => {
          uploadProgress.value[moduleId] = progress;
        }),
      );
      knowledgeBases.value = await gateway.listKnowledgeBases();
    } finally {
      delete uploadProgress.value[moduleId];
    }
  }

  async function configureProvider(
    input: ConfigureProviderInput,
  ): Promise<void> {
    const configured = await execute(() => gateway.configureProvider(input));

    modelProviders.value = replaceById(modelProviders.value, configured);
  }

  async function createApiApplication(
    input: CreateApiApplicationInput,
  ): Promise<void> {
    const created = await execute(() => gateway.createApiApplication(input));

    latestSecretKey.value = created.secretKey ?? '';
    apiApplications.value.unshift({
      ...created,
      secretKey: undefined,
    });
  }

  function clearLatestSecretKey(): void {
    latestSecretKey.value = '';
  }

  function providerName(providerId: string): string {
    return (
      modelProviders.value.find((provider) => provider.id === providerId)
        ?.name ?? '未知模型'
    );
  }

  function agentName(agentId: string): string {
    return (
      agents.value.find((agent) => agent.id === agentId)?.name ?? '未知智能体'
    );
  }

  function chat(
    agentId: string,
    messages: ConversationMessage[],
    onDelta: (content: string) => void,
  ): ReturnType<typeof gateway.chat> {
    return gateway.chat(agentId, messages, onDelta);
  }

  function uploadChatAttachment(
    file: File,
  ): ReturnType<typeof gateway.uploadChatAttachment> {
    return gateway.uploadChatAttachment(file);
  }

  return {
    agentName,
    agents,
    apiApplications,
    chat,
    clearLatestSecretKey,
    configureProvider,
    createAgent,
    createApiApplication,
    createKnowledgeBase,
    createKnowledgeModule,
    deleteAgent,
    documentCount,
    enabledProviderCount,
    errorMessage,
    initialize,
    isLoading,
    isSaving,
    knowledgeBases,
    latestSecretKey,
    modelProviders,
    providerName,
    publishedAgentCount,
    refreshKnowledgeBases,
    requestCount,
    updateAgent,
    updateAgentStatus,
    uploadChatAttachment,
    uploadKnowledgeFile,
    uploadProgress,
  };
});
