import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('model_providers')
export class ModelProviderEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { unique: true })
  key: string;

  @Column('text')
  name: string;

  @Column('text')
  description: string;

  @Column('text')
  baseUrl: string;

  @Column('text', { nullable: true })
  chatModel?: string;

  @Column('real', { nullable: true })
  chatInputCostPerMillionTokens?: number;

  @Column('real', { nullable: true })
  chatOutputCostPerMillionTokens?: number;

  @Column('text', { nullable: true })
  embeddingModel?: string;

  @Column('integer', { nullable: true })
  embeddingDimensions?: number;

  @Column('real', { nullable: true })
  embeddingInputCostPerMillionTokens?: number;

  @Column('text')
  credentialCiphertext: string;

  @Column('text')
  credentialInitializationVector: string;

  @Column('text')
  credentialAuthTag: string;

  @Column('boolean', { default: true })
  enabled: boolean;

  @Column('datetime')
  createdAt: Date;

  @Column('datetime')
  updatedAt: Date;
}
