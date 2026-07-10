import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { AgentRepository } from '../application/agent.repository';
import type {
  Agent,
  AgentDetail,
  AgentStatus,
  AgentSummary,
} from '../domain/agent';
import { AgentEntity } from './agent.entity';
import { AgentKnowledgeModuleEntity } from './agent-knowledge-module.entity';

@Injectable()
export class TypeOrmAgentRepository extends AgentRepository {
  constructor(
    @InjectRepository(AgentEntity)
    private readonly agents: Repository<AgentEntity>,
    @InjectRepository(AgentKnowledgeModuleEntity)
    private readonly bindings: Repository<AgentKnowledgeModuleEntity>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async delete(id: string): Promise<void> {
    await this.agents.delete(id);
  }

  async findById(id: string): Promise<AgentDetail | undefined> {
    const [agent, bindings] = await Promise.all([
      this.agents.findOneBy({ id }),
      this.bindings.findBy({ agentId: id }),
    ]);

    return agent
      ? {
          ...agent,
          moduleIds: bindings.map((binding) => binding.moduleId),
        }
      : undefined;
  }

  async incrementConversationCount(id: string): Promise<void> {
    await this.agents.increment({ id }, 'conversationCount', 1);
  }

  async list(): Promise<AgentSummary[]> {
    const [agents, bindings] = await Promise.all([
      this.agents.find({ order: { updatedAt: 'DESC' } }),
      this.bindings.find(),
    ]);

    return agents.map((agent) => ({
      conversationCount: agent.conversationCount,
      description: agent.description,
      id: agent.id,
      moduleIds: bindings
        .filter((binding) => binding.agentId === agent.id)
        .map((binding) => binding.moduleId),
      name: agent.name,
      providerId: agent.providerId,
      status: agent.status,
      systemPrompt: agent.systemPrompt,
      temperature: agent.temperature,
      updatedAt: agent.updatedAt.toISOString(),
    }));
  }

  async save(agent: Agent, moduleIds: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(AgentEntity).save(agent);
      await this.saveBindings(manager, agent.id, moduleIds);
    });
  }

  async update(agent: Agent, moduleIds: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(AgentEntity).save(agent);
      await manager
        .getRepository(AgentKnowledgeModuleEntity)
        .delete({ agentId: agent.id });
      await this.saveBindings(manager, agent.id, moduleIds);
    });
  }

  async updateStatus(id: string, status: AgentStatus): Promise<void> {
    await this.agents.update(id, {
      status,
      updatedAt: new Date(),
    });
  }

  private async saveBindings(
    manager: EntityManager,
    agentId: string,
    moduleIds: string[],
  ): Promise<void> {
    const bindings = [...new Set(moduleIds)].map((moduleId) => ({
      agentId,
      id: randomUUID(),
      moduleId,
    }));

    if (bindings.length > 0) {
      await manager.getRepository(AgentKnowledgeModuleEntity).save(bindings);
    }
  }
}
