import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('knowledge_modules')
@Index(['knowledgeBaseId', 'name'], { unique: true })
export class KnowledgeModuleEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  knowledgeBaseId: string;

  @Column('text')
  name: string;

  @Column('text')
  description: string;

  @Column('datetime')
  createdAt: Date;

  @Column('datetime')
  updatedAt: Date;
}
