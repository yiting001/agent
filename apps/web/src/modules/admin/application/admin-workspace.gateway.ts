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
  KnowledgeModuleSummary,
  ModelProviderSummary,
  SkillSummary,
  UpdateSkillInput,
} from '../domain/admin-workspace';

export abstract class AdminWorkspaceGateway {
  abstract chat(
    agentId: string,
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

  abstract deleteSkill(skillId: string): Promise<void>;

  abstract installSkill(input: InstallSkillInput): Promise<SkillSummary>;

  abstract listAgents(): Promise<AgentSummary[]>;

  abstract listApiApplications(): Promise<ApiApplicationSummary[]>;

  abstract listKnowledgeBases(): Promise<KnowledgeBaseSummary[]>;

  abstract listModelProviders(): Promise<ModelProviderSummary[]>;

  abstract listSkills(): Promise<SkillSummary[]>;

  abstract updateAgent(
    agentId: string,
    input: CreateAgentInput,
  ): Promise<AgentSummary>;

  abstract updateAgentStatus(
    agentId: string,
    status: AgentStatus,
  ): Promise<AgentSummary>;

  abstract updateSkill(
    skillId: string,
    input: UpdateSkillInput,
  ): Promise<SkillSummary>;

  abstract uploadChatAttachment(file: File): Promise<ChatAttachmentSummary>;

  abstract uploadKnowledgeFile(
    moduleId: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<void>;
}
