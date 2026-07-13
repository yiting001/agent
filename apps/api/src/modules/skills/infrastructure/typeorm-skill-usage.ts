import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AgentSkillEntity } from '../../agents/infrastructure/agent-skill.entity';
import { SkillUsage } from '../application/skill-usage';

@Injectable()
export class TypeOrmSkillUsage extends SkillUsage {
  constructor(
    @InjectRepository(AgentSkillEntity)
    private readonly bindings: Repository<AgentSkillEntity>,
  ) {
    super();
  }

  async countBoundAgents(skillId: string): Promise<number> {
    const bindings = await this.bindings.findBy({ skillId });

    return new Set(bindings.map((binding) => binding.agentId)).size;
  }
}
