import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { KnowledgeDocumentStatus } from '../../domain/knowledge';

@Entity('knowledge_documents')
@Index(['moduleId', 'sha256'])
export class KnowledgeDocumentEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  moduleId: string;

  @Column('text')
  fileName: string;

  @Column('text')
  mimeType: string;

  @Column('integer')
  sizeBytes: number;

  @Column('text')
  sha256: string;

  @Column('text')
  storageKey: string;

  @Column('text')
  status: KnowledgeDocumentStatus;

  @Column('integer', { default: 0 })
  chunkCount: number;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('datetime')
  createdAt: Date;

  @Column('datetime')
  updatedAt: Date;
}
