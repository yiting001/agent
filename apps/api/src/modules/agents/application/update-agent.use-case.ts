import { Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../shared/application/application-error';
import { KnowledgeCatalogService } from '../../knowledge/application/knowledge-catalog.service';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import { SkillCatalogService } from '../../skills/application/skill-catalog.service';
import type { AgentSummary } from '../domain/agent';
import { AgentCatalogService } from './agent-catalog.service';
import { AgentRepository } from './agent.repository';
import type { CreateAgentCommand } from './create-agent.use-case';

/** 更新智能体的基础信息、模型与知识模块绑定（不含状态）。 */
@Injectable()
export class UpdateAgentUseCase {
  constructor(
    private readonly catalog: AgentCatalogService,
    private readonly repository: AgentRepository,
    private readonly knowledgeCatalog: KnowledgeCatalogService,
    private readonly modelProviders: ModelProviderRuntimeService,
    private readonly skillCatalog: SkillCatalogService,
  ) {}

  async execute(
    id: string,
    command: CreateAgentCommand,
  ): Promise<AgentSummary> {
    const existing = await this.catalog.get(id);
    const provider = await this.modelProviders.get(command.providerId);

    if (!provider.chatModel) {
      throw new ApplicationError(
        'invalid_operation',
        '所选模型服务未配置对话模型。',
      );
    }

    await this.knowledgeCatalog.getModules(command.moduleIds);
    await this.skillCatalog.getSkills(command.skillIds);

    const now = new Date();
    const agent = {
      conversationCount: existing.conversationCount,
      createdAt: existing.createdAt,
      description: command.description,
      id: existing.id,
      name: command.name,
      providerId: provider.id,
      status: existing.status,
      systemPrompt: command.systemPrompt,
      temperature: command.temperature,
      updatedAt: now,
    };

    await this.repository.save(agent, command.moduleIds, command.skillIds);

    return {
      conversationCount: agent.conversationCount,
      description: agent.description,
      id: agent.id,
      moduleIds: [...new Set(command.moduleIds)],
      name: agent.name,
      providerId: agent.providerId,
      skillIds: [...new Set(command.skillIds)],
      status: agent.status,
      systemPrompt: agent.systemPrompt,
      temperature: agent.temperature,
      updatedAt: now.toISOString(),
    };
  }
}
