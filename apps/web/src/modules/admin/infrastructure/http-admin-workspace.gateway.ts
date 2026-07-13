import type { HttpClient } from '@/shared/http/http-client';

import { AdminWorkspaceGateway } from '../application/admin-workspace.gateway';
import type {
  AgentChatResponse,
  AgentStatus,
  AgentSummary,
  ApiApplicationSummary,
  ChatAttachmentSummary,
  ConfigureProviderInput,
  ConversationMessage,
  CreateAgentInput,
  CreateApiApplicationInput,
  CreateKnowledgeBaseInput,
  CreateKnowledgeModuleInput,
  InstallSkillInput,
  KnowledgeBaseSummary,
  KnowledgeDocumentContent,
  KnowledgeDocumentSummary,
  KnowledgeModuleSummary,
  ModelProviderSummary,
  SkillSummary,
  UpdateKnowledgeResourceInput,
  UpdateSkillInput,
} from '../domain/admin-workspace';

interface UploadSessionSummary {
  chunkSizeBytes: number;
  expectedParts: number;
  id: string;
}

function parseRecord(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('流式响应格式无效。');
  }

  return parsed as Record<string, unknown>;
}

export class HttpAdminWorkspaceGateway extends AdminWorkspaceGateway {
  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  async chat(
    agentId: string,
    messages: ConversationMessage[],
    onDelta: (content: string) => void,
  ): Promise<AgentChatResponse> {
    let result: AgentChatResponse = {
      agentId,
      answer: '',
      citations: [],
    };

    await this.httpClient.postEventStream(
      `/agents/${agentId}/chat`,
      { messages },
      (event, data) => {
        const payload = parseRecord(data);

        if (event === 'metadata' && Array.isArray(payload.citations)) {
          result = {
            ...result,
            citations: payload.citations as AgentChatResponse['citations'],
          };
        }

        if (event === 'delta' && typeof payload.content === 'string') {
          result.answer += payload.content;
          onDelta(payload.content);
        }

        if (event === 'error') {
          throw new Error(
            typeof payload.message === 'string'
              ? payload.message
              : '模型流式响应失败。',
          );
        }
      },
    );

    return result;
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

  deleteAgent(agentId: string): Promise<void> {
    return this.httpClient.delete<void>(`/agents/${agentId}`);
  }

  deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    return this.httpClient.delete<void>(`/knowledge-bases/${knowledgeBaseId}`);
  }

  deleteKnowledgeDocument(documentId: string): Promise<void> {
    return this.httpClient.delete<void>(`/knowledge-documents/${documentId}`);
  }

  deleteKnowledgeModule(moduleId: string): Promise<void> {
    return this.httpClient.delete<void>(`/knowledge-modules/${moduleId}`);
  }

  deleteSkill(skillId: string): Promise<void> {
    return this.httpClient.delete<void>(`/skills/${skillId}`);
  }

  getKnowledgeDocumentContent(
    documentId: string,
  ): Promise<KnowledgeDocumentContent> {
    return this.httpClient.get<KnowledgeDocumentContent>(
      `/knowledge-documents/${documentId}/content`,
    );
  }

  installSkill(input: InstallSkillInput): Promise<SkillSummary> {
    return this.httpClient.post<SkillSummary, InstallSkillInput>(
      '/skills',
      input,
    );
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

  listModuleDocuments(moduleId: string): Promise<KnowledgeDocumentSummary[]> {
    return this.httpClient.get<KnowledgeDocumentSummary[]>(
      `/knowledge-modules/${moduleId}/documents`,
    );
  }

  listSkills(): Promise<SkillSummary[]> {
    return this.httpClient.get<SkillSummary[]>('/skills');
  }

  updateAgent(agentId: string, input: CreateAgentInput): Promise<AgentSummary> {
    return this.httpClient.put<AgentSummary, CreateAgentInput>(
      `/agents/${agentId}`,
      input,
    );
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

  updateKnowledgeBase(
    input: UpdateKnowledgeResourceInput,
  ): Promise<KnowledgeBaseSummary> {
    return this.httpClient.put<
      KnowledgeBaseSummary,
      Omit<UpdateKnowledgeResourceInput, 'id'>
    >(`/knowledge-bases/${input.id}`, {
      description: input.description,
      name: input.name,
    });
  }

  updateKnowledgeModule(
    input: UpdateKnowledgeResourceInput,
  ): Promise<KnowledgeModuleSummary> {
    return this.httpClient.put<
      KnowledgeModuleSummary,
      Omit<UpdateKnowledgeResourceInput, 'id'>
    >(`/knowledge-modules/${input.id}`, {
      description: input.description,
      name: input.name,
    });
  }

  updateSkill(skillId: string, input: UpdateSkillInput): Promise<SkillSummary> {
    return this.httpClient.put<SkillSummary, UpdateSkillInput>(
      `/skills/${skillId}`,
      input,
    );
  }

  uploadChatAttachment(file: File): Promise<ChatAttachmentSummary> {
    return this.httpClient.postFile<ChatAttachmentSummary>(
      '/chat-attachments',
      file,
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
