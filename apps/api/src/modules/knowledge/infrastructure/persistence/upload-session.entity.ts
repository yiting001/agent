import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { UploadSessionStatus } from '../../domain/knowledge-upload';

@Entity('knowledge_upload_sessions')
export class UploadSessionEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  moduleId: string;

  @Column('text')
  fileName: string;

  @Column('text')
  mimeType: string;

  @Column('integer')
  totalBytes: number;

  @Column('integer')
  chunkSizeBytes: number;

  @Column('integer')
  expectedParts: number;

  @Column('integer')
  receivedBytes: number;

  @Column('text')
  status: UploadSessionStatus;

  @Column('timestamptz')
  expiresAt: Date;

  @Column('timestamptz')
  createdAt: Date;
}
