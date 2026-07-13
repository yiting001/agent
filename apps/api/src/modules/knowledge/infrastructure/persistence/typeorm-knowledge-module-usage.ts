import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AgentKnowledgeModuleEntity } from '../../../agents/infrastructure/agent-knowledge-module.entity';
import { KnowledgeModuleUsage } from '../../application/knowledge-module-usage';

@Injectable()
export class TypeOrmKnowledgeModuleUsage extends KnowledgeModuleUsage {
  constructor(
    @InjectRepository(AgentKnowledgeModuleEntity)
    private readonly bindings: Repository<AgentKnowledgeModuleEntity>,
  ) {
    super();
  }

  async countBoundAgents(moduleIds: string[]): Promise<number> {
    if (moduleIds.length === 0) {
      return 0;
    }

    const bindings = await this.bindings.findBy({ moduleId: In(moduleIds) });

    return new Set(bindings.map((binding) => binding.agentId)).size;
  }
}
