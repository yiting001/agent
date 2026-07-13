import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';

import { AgentRepository } from '../application/agent.repository';
import type {
  Agent,
  AgentDetail,
  AgentStatus,
  AgentSummary,
} from '../domain/agent';
import { AgentEntity } from './agent.entity';
import { AgentKnowledgeModuleEntity } from './agent-knowledge-module.entity';
import { AgentSkillEntity } from './agent-skill.entity';

@Injectable()
export class TypeOrmAgentRepository extends AgentRepository {
  constructor(
    @InjectRepository(AgentEntity)
    private readonly agents: Repository<AgentEntity>,
    @InjectRepository(AgentKnowledgeModuleEntity)
    private readonly bindings: Repository<AgentKnowledgeModuleEntity>,
    @InjectRepository(AgentSkillEntity)
    private readonly skillBindings: Repository<AgentSkillEntity>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(AgentKnowledgeModuleEntity)
        .delete({ agentId: id });
      await manager.getRepository(AgentSkillEntity).delete({ agentId: id });
      await manager.getRepository(AgentEntity).delete({ id });
    });
  }

  async findById(id: string): Promise<AgentDetail | undefined> {
    const [agent, bindings, skillBindings] = await Promise.all([
      this.agents.findOneBy({ id }),
      this.bindings.findBy({ agentId: id }),
      this.skillBindings.findBy({ agentId: id }),
    ]);

    return agent
      ? {
          ...agent,
          moduleIds: bindings.map((binding) => binding.moduleId),
          skillIds: skillBindings.map((binding) => binding.skillId),
        }
      : undefined;
  }

  async incrementConversationCount(id: string): Promise<void> {
    await this.agents.increment({ id }, 'conversationCount', 1);
  }

  async list(): Promise<AgentSummary[]> {
    const [agents, bindings, skillBindings] = await Promise.all([
      this.agents.find({ order: { updatedAt: 'DESC' } }),
      this.bindings.find(),
      this.skillBindings.find(),
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
      skillIds: skillBindings
        .filter((binding) => binding.agentId === agent.id)
        .map((binding) => binding.skillId),
      status: agent.status,
      systemPrompt: agent.systemPrompt,
      temperature: agent.temperature,
      updatedAt: agent.updatedAt.toISOString(),
    }));
  }

  async save(
    agent: Agent,
    moduleIds: string[],
    skillIds: string[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(AgentEntity).save(agent);
      await manager
        .getRepository(AgentKnowledgeModuleEntity)
        .delete({ agentId: agent.id });
      await manager.getRepository(AgentKnowledgeModuleEntity).save(
        [...new Set(moduleIds)].map((moduleId) => ({
          agentId: agent.id,
          id: randomUUID(),
          moduleId,
        })),
      );
      await manager
        .getRepository(AgentSkillEntity)
        .delete({ agentId: agent.id });
      await manager.getRepository(AgentSkillEntity).save(
        [...new Set(skillIds)].map((skillId) => ({
          agentId: agent.id,
          id: randomUUID(),
          skillId,
        })),
      );
    });
  }

  async updateStatus(id: string, status: AgentStatus): Promise<void> {
    await this.agents.update(id, {
      status,
      updatedAt: new Date(),
    });
  }
}
