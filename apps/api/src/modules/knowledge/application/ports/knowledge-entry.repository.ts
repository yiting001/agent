import type {
  KnowledgeEntry,
  KnowledgeEntryChanges,
  KnowledgeEntryDraft,
} from '../../domain/knowledge-entry';

/** Injection token binding the repository port to its adapter. */
export const KNOWLEDGE_ENTRY_REPOSITORY = Symbol('KnowledgeEntryRepository');

/** Persistence boundary for knowledge entries; adapters own storage details. */
export interface KnowledgeEntryRepository {
  create(draft: KnowledgeEntryDraft): Promise<KnowledgeEntry>;
  deleteById(id: string): Promise<boolean>;
  findAll(): Promise<KnowledgeEntry[]>;
  findById(id: string): Promise<KnowledgeEntry | null>;
  update(
    id: string,
    changes: KnowledgeEntryChanges,
  ): Promise<KnowledgeEntry | null>;
}
