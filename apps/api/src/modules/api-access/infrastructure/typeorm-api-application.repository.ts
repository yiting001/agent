import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApiApplicationRepository } from '../application/api-application.repository';
import type {
  ApiApplication,
  ApiApplicationSummary,
} from '../domain/api-application';
import { ApiApplicationEntity } from './api-application.entity';

@Injectable()
export class TypeOrmApiApplicationRepository extends ApiApplicationRepository {
  constructor(
    @InjectRepository(ApiApplicationEntity)
    private readonly repository: Repository<ApiApplicationEntity>,
  ) {
    super();
  }

  async findByKeyHash(keyHash: string): Promise<ApiApplication | undefined> {
    const entity = await this.repository.findOneBy({ keyHash });

    return entity ? { ...entity } : undefined;
  }

  async incrementRequestCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'requestCount', 1);
  }

  async list(): Promise<ApiApplicationSummary[]> {
    const applications = await this.repository.find({
      order: { createdAt: 'DESC' },
    });

    return applications.map((application) => ({
      agentId: application.agentId,
      createdAt: application.createdAt.toISOString(),
      endpoint: '/v1/chat/completions',
      id: application.id,
      maskedKey: application.maskedKey,
      name: application.name,
      requestCount: application.requestCount,
      status: application.status,
    }));
  }

  async save(application: ApiApplication): Promise<void> {
    await this.repository.save(application);
  }
}
