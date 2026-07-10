import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { ModelProvider } from '../domain/model-provider';
import { ModelProviderRepository } from '../application/model-provider.repository';
import { ModelProviderEntity } from './model-provider.entity';

function toDomain(entity: ModelProviderEntity): ModelProvider {
  return {
    baseUrl: entity.baseUrl,
    chatModel: entity.chatModel,
    createdAt: entity.createdAt,
    credential: {
      authTag: entity.credentialAuthTag,
      ciphertext: entity.credentialCiphertext,
      initializationVector: entity.credentialInitializationVector,
    },
    description: entity.description,
    embeddingDimensions: entity.embeddingDimensions,
    embeddingModel: entity.embeddingModel,
    enabled: entity.enabled,
    id: entity.id,
    key: entity.key,
    name: entity.name,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class TypeOrmModelProviderRepository extends ModelProviderRepository {
  constructor(
    @InjectRepository(ModelProviderEntity)
    private readonly repository: Repository<ModelProviderEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<ModelProvider | undefined> {
    const entity = await this.repository.findOneBy({ id });

    return entity ? toDomain(entity) : undefined;
  }

  async findByKey(key: string): Promise<ModelProvider | undefined> {
    const entity = await this.repository.findOneBy({ key });

    return entity ? toDomain(entity) : undefined;
  }

  async list(): Promise<ModelProvider[]> {
    const entities = await this.repository.find({
      order: { updatedAt: 'DESC' },
    });

    return entities.map(toDomain);
  }

  async save(provider: ModelProvider): Promise<void> {
    await this.repository.save({
      baseUrl: provider.baseUrl,
      chatModel: provider.chatModel,
      createdAt: provider.createdAt,
      credentialAuthTag: provider.credential.authTag,
      credentialCiphertext: provider.credential.ciphertext,
      credentialInitializationVector: provider.credential.initializationVector,
      description: provider.description,
      embeddingDimensions: provider.embeddingDimensions,
      embeddingModel: provider.embeddingModel,
      enabled: provider.enabled,
      id: provider.id,
      key: provider.key,
      name: provider.name,
      updatedAt: provider.updatedAt,
    });
  }
}
