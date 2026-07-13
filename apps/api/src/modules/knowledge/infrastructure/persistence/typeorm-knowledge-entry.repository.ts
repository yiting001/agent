import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type {
  KnowledgeEntry,
  KnowledgeEntryChanges,
  KnowledgeEntryDraft,
} from '../../domain/knowledge-entry';
import type { KnowledgeEntryRepository } from '../../application/ports/knowledge-entry.repository';
import { KnowledgeEntryOrmEntity } from './knowledge-entry.orm-entity';

function toDomain(row: KnowledgeEntryOrmEntity): KnowledgeEntry {
  return {
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    tags: row.tags,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** SQLite-backed adapter for the knowledge entry repository port. */
@Injectable()
export class TypeormKnowledgeEntryRepository
  implements KnowledgeEntryRepository
{
  constructor(
    @InjectRepository(KnowledgeEntryOrmEntity)
    private readonly rows: Repository<KnowledgeEntryOrmEntity>,
  ) {}

  async create(draft: KnowledgeEntryDraft): Promise<KnowledgeEntry> {
    const row = await this.rows.save(
      this.rows.create({
        content: draft.content,
        tags: [...draft.tags],
        title: draft.title,
      }),
    );

    return toDomain(row);
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.rows.delete({ id });

    return (result.affected ?? 0) > 0;
  }

  async findAll(): Promise<KnowledgeEntry[]> {
    const rows = await this.rows.find({ order: { updatedAt: 'DESC' } });

    return rows.map(toDomain);
  }

  async findById(id: string): Promise<KnowledgeEntry | null> {
    const row = await this.rows.findOneBy({ id });

    return row ? toDomain(row) : null;
  }

  async update(
    id: string,
    changes: KnowledgeEntryChanges,
  ): Promise<KnowledgeEntry | null> {
    const row = await this.rows.findOneBy({ id });

    if (!row) {
      return null;
    }

    row.title = changes.title ?? row.title;
    row.content = changes.content ?? row.content;
    row.tags = changes.tags ? [...changes.tags] : row.tags;

    return toDomain(await this.rows.save(row));
  }
}
