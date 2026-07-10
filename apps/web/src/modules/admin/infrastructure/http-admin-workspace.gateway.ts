import type { HttpClient } from '@/shared/http/http-client';

import { AdminWorkspaceGateway } from '../application/admin-workspace.gateway';
import type {
  AgentChatResponse,
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
  KnowledgeModuleSummary,
  ModelProviderSummary,
} from '../domain/admin-workspace';

interface UploadSessionSummary {
  chunkSizeBytes: number;
  expectedParts: number;
  id: string;
}

export class HttpAdminWorkspaceGateway extends AdminWorkspaceGateway {
  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  chat(
    agentId: string,
    messages: ConversationMessage[],
  ): Promise<AgentChatResponse> {
    return this.httpClient.post<
      AgentChatResponse,
      { messages: ConversationMessage[] }
    >(`/agents/${agentId}/chat`, { messages });
  }

  configureProvider(
    input: ConfigureProviderInput,
  ): Promise<ModelProviderSummary> {
    return this.httpClient.put<
      ModelProviderSummary,
      Omit<ConfigureProviderInput, 'key'>
    >(`/model-providers/${encodeURIComponent(input.key)}`, {
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
      chatModel: input.chatModel,
      description: input.description,
      embeddingDimensions: input.embeddingDimensions,
      embeddingModel: input.embeddingModel,
      name: input.name,
    });
  }

  createAgent(input: CreateAgentInput): Promise<AgentSummary> {
    return this.httpClient.post<AgentSummary, CreateAgentInput>(
      '/agents',
      input,
    );
  }

  createApiApplication(
    input: CreateApiApplicationInput,
  ): Promise<ApiApplicationSummary> {
    return this.httpClient.post<
      ApiApplicationSummary,
      CreateApiApplicationInput
    >('/api-applications', input);
  }

  createKnowledgeBase(
    input: CreateKnowledgeBaseInput,
  ): Promise<KnowledgeBaseSummary> {
    return this.httpClient.post<KnowledgeBaseSummary, CreateKnowledgeBaseInput>(
      '/knowledge-bases',
      input,
    );
  }

  createKnowledgeModule(
    input: CreateKnowledgeModuleInput,
  ): Promise<KnowledgeModuleSummary> {
    return this.httpClient.post<
      KnowledgeModuleSummary,
      Omit<CreateKnowledgeModuleInput, 'knowledgeBaseId'>
    >(`/knowledge-bases/${input.knowledgeBaseId}/modules`, {
      description: input.description,
      name: input.name,
    });
  }

  listAgents(): Promise<AgentSummary[]> {
    return this.httpClient.get<AgentSummary[]>('/agents');
  }

  listApiApplications(): Promise<ApiApplicationSummary[]> {
    return this.httpClient.get<ApiApplicationSummary[]>('/api-applications');
  }

  listKnowledgeBases(): Promise<KnowledgeBaseSummary[]> {
    return this.httpClient.get<KnowledgeBaseSummary[]>('/knowledge-bases');
  }

  listModelProviders(): Promise<ModelProviderSummary[]> {
    return this.httpClient.get<ModelProviderSummary[]>('/model-providers');
  }

  updateAgentStatus(
    agentId: string,
    status: AgentStatus,
  ): Promise<AgentSummary> {
    return this.httpClient.patch<AgentSummary, { status: AgentStatus }>(
      `/agents/${agentId}/status`,
      { status },
    );
  }

  async uploadKnowledgeFile(
    moduleId: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<void> {
    const session = await this.httpClient.post<
      UploadSessionSummary,
      { fileName: string; mimeType: string; totalBytes: number }
    >(`/knowledge-modules/${moduleId}/uploads`, {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      totalBytes: file.size,
    });

    for (
      let partNumber = 1;
      partNumber <= session.expectedParts;
      partNumber += 1
    ) {
      const start = (partNumber - 1) * session.chunkSizeBytes;
      const end = Math.min(start + session.chunkSizeBytes, file.size);

      await this.httpClient.putBlob(
        `/uploads/${session.id}/parts/${partNumber}`,
        file.slice(start, end),
      );
      onProgress(Math.round((partNumber / session.expectedParts) * 100));
    }

    await this.httpClient.post(`/uploads/${session.id}/complete`, {});
  }
}
