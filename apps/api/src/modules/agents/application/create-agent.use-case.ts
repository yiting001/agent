import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApplicationError } from '../../../shared/application/application-error';
import { KnowledgeCatalogService } from '../../knowledge/application/knowledge-catalog.service';
import { ModelProviderRuntimeService } from '../../model-providers/application/model-provider-runtime.service';
import { SkillCatalogService } from '../../skills/application/skill-catalog.service';
import type { AgentSummary } from '../domain/agent';
import { AgentRepository } from './agent.repository';

export interface CreateAgentCommand {
  description: string;
  moduleIds: string[];
  name: string;
  providerId: string;
  skillIds: string[];
  systemPrompt: string;
  temperature: number;
}

@Injectable()
export class CreateAgentUseCase {
  constructor(
    private readonly repository: AgentRepository,
    private readonly knowledgeCatalog: KnowledgeCatalogService,
    private readonly modelProviders: ModelProviderRuntimeService,
    private readonly skillCatalog: SkillCatalogService,
  ) {}

  async execute(command: CreateAgentCommand): Promise<AgentSummary> {
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
      conversationCount: 0,
      createdAt: now,
      description: command.description,
      id: randomUUID(),
      name: command.name,
      providerId: provider.id,
      status: 'draft' as const,
      systemPrompt: command.systemPrompt,
      temperature: command.temperature,
      updatedAt: now,
    };

    await this.repository.save(agent, command.moduleIds, command.skillIds);

    return {
      conversationCount: 0,
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
