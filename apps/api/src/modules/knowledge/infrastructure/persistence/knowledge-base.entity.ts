import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('knowledge_bases')
export class KnowledgeBaseEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  description: string;

  @Column('text')
  embeddingProviderId: string;

  @Column('text')
  embeddingModel: string;

  @Column('integer')
  embeddingDimensions: number;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  updatedAt: Date;
}
