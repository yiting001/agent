import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('brand_settings')
export class BrandSettingsEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  softwareName: string;

  @Column('text', { nullable: true })
  iconStorageKey?: string;

  @Column('text', { nullable: true })
  iconMimeType?: string;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  updatedAt: Date;
}
