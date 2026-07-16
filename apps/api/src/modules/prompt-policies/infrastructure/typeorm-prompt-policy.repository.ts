import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PromptPolicyRepository } from '../application/prompt-policy.repository';
import type { PromptPolicy } from '../domain/prompt-policy';
import { PromptPolicyEntity } from './prompt-policy.entity';

@Injectable()
export class TypeOrmPromptPolicyRepository extends PromptPolicyRepository {
  constructor(
    @InjectRepository(PromptPolicyEntity)
    private readonly policies: Repository<PromptPolicyEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<PromptPolicy | undefined> {
    const entity = await this.policies.findOneBy({ id });

    return entity ? { ...entity } : undefined;
  }

  async list(): Promise<PromptPolicy[]> {
    const entities = await this.policies.find({
      order: { priority: 'ASC', key: 'ASC' },
    });

    return entities.map((entity) => ({ ...entity }));
  }

  async update(
    policy: PromptPolicy,
    expectedRevision: number,
  ): Promise<boolean> {
    const result = await this.policies.update(
      { id: policy.id, revision: expectedRevision },
      {
        content: policy.content,
        description: policy.description,
        enabled: policy.enabled,
        name: policy.name,
        priority: policy.priority,
        revision: policy.revision,
        updatedAt: policy.updatedAt,
      },
    );

    return result.affected === 1;
  }
}
