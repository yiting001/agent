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
  GenerationFeedback,
  SkillSummary,
  SubmitGenerationFeedbackInput,
  UpdateKnowledgeResourceInput,
  UpdateSkillInput,
} from '../domain/admin-workspace';

/** 管理工作台访问后端能力的应用层端口。 */
export abstract class AdminWorkspaceGateway {
  /** 消费 SSE 文本增量，并在结束后返回引用和会话元数据。 */
  abstract chat(
    agentId: string,
    conversationId: string,
    memoryOwnerToken: string,
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

  /** 向服务端申请不可伪造的匿名记忆主体凭证。 */
  abstract createMemoryOwnerToken(): Promise<string>;

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

  abstract submitGenerationFeedback(
    input: SubmitGenerationFeedbackInput,
  ): Promise<GenerationFeedback>;

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
    ownerToken: string,
    file: File,
  ): Promise<ChatAttachmentSummary>;

  /** 分片上传知识文件，并通过回调报告 0-100 进度。 */
  abstract uploadKnowledgeFile(
    moduleId: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<void>;
}
