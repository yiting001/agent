import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('knowledge_upload_parts')
@Index(['uploadSessionId', 'partNumber'], { unique: true })
export class UploadPartEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  uploadSessionId: string;

  @Column('integer')
  partNumber: number;

  @Column('integer')
  sizeBytes: number;

  @Column('text')
  sha256: string;

  @Column('text')
  storageKey: string;
}
