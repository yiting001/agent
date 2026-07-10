import { Injectable } from '@nestjs/common';

import type { Agent, AgentSummary } from '../domain/agent';
import { AgentCatalogService } from './agent-catalog.service';
import { AgentConfigurationService } from './agent-configuration.service';
import { AgentRepository } from './agent.repository';
import { toAgentSummary } from './agent-summary';

export interface UpdateAgentCommand {
  description: string;
  moduleIds: string[];
  name: string;
  providerId: string;
  systemPrompt: string;
  temperature: number;
}

@Injectable()
export class UpdateAgentUseCase {
  constructor(
    private readonly catalog: AgentCatalogService,
    private readonly configuration: AgentConfigurationService,
    private readonly repository: AgentRepository,
  ) {}

  async execute(
    id: string,
    command: UpdateAgentCommand,
  ): Promise<AgentSummary> {
    const current = await this.catalog.get(id);
    const configuration = await this.configuration.resolve(
      command.providerId,
      command.moduleIds,
    );
    const agent: Agent = {
      conversationCount: current.conversationCount,
      createdAt: current.createdAt,
      description: command.description,
      id: current.id,
      name: command.name,
      providerId: configuration.providerId,
      status: current.status,
      systemPrompt: command.systemPrompt,
      temperature: command.temperature,
      updatedAt: new Date(),
    };

    await this.repository.update(agent, configuration.moduleIds);

    return toAgentSummary(agent, configuration.moduleIds);
  }
}
