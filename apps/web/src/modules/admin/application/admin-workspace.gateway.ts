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

export abstract class AdminWorkspaceGateway {
  abstract chat(
    agentId: string,
    conversationId: string,
    memoryOwnerKey: string,
    messages: ConversationMessage[],
    onDelta: (content: string) => void,
  ): Promise<AgentChatResponse>;

  abstract configureProvider(
    input: ConfigureProviderInput,
  ): Promise<ModelProviderSummary>;

  abstract createAgent(input: CreateAgentInput): Promise<AgentSummary>;

  abstract createApiApplication(
    input: CreateApiApplicationInput,
  ): Promise<ApiApplicationSummary>;

  abstract createKnowledgeBase(
    input: CreateKnowledgeBaseInput,
  ): Promise<KnowledgeBaseSummary>;

  abstract createKnowledgeModule(
    input: CreateKnowledgeModuleInput,
  ): Promise<KnowledgeModuleSummary>;

  abstract deleteAgent(agentId: string): Promise<void>;

  abstract deleteKnowledgeBase(knowledgeBaseId: string): Promise<void>;

  abstract deleteKnowledgeDocument(documentId: string): Promise<void>;

  abstract deleteKnowledgeModule(moduleId: string): Promise<void>;

  abstract deleteSkill(skillId: string): Promise<void>;

  abstract getKnowledgeDocumentContent(
    documentId: string,
  ): Promise<KnowledgeDocumentContent>;

  abstract installSkill(input: InstallSkillInput): Promise<SkillSummary>;

  abstract listAgents(): Promise<AgentSummary[]>;

  abstract listApiApplications(): Promise<ApiApplicationSummary[]>;

  abstract listKnowledgeBases(): Promise<KnowledgeBaseSummary[]>;

  abstract listModelProviders(): Promise<ModelProviderSummary[]>;

  abstract listModuleDocuments(
    moduleId: string,
  ): Promise<KnowledgeDocumentSummary[]>;

  abstract listSkills(): Promise<SkillSummary[]>;

  abstract updateAgent(
    agentId: string,
    input: CreateAgentInput,
  ): Promise<AgentSummary>;

  abstract updateAgentStatus(
    agentId: string,
    status: AgentStatus,
  ): Promise<AgentSummary>;

  abstract updateKnowledgeBase(
    input: UpdateKnowledgeResourceInput,
  ): Promise<KnowledgeBaseSummary>;

  abstract updateKnowledgeModule(
    input: UpdateKnowledgeResourceInput,
  ): Promise<KnowledgeModuleSummary>;

  abstract updateSkill(
    skillId: string,
    input: UpdateSkillInput,
  ): Promise<SkillSummary>;

  abstract uploadChatAttachment(
    agentId: string,
    ownerKey: string,
    file: File,
  ): Promise<ChatAttachmentSummary>;

  abstract uploadKnowledgeFile(
    moduleId: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<void>;
}
