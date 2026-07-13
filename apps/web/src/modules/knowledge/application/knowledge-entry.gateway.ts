import type {
  KnowledgeEntry,
  KnowledgeEntryDraft,
} from '../domain/knowledge-entry';

/** Data access port the knowledge feature depends on. */
export interface KnowledgeEntryGateway {
  create(draft: KnowledgeEntryDraft): Promise<KnowledgeEntry>;
  list(): Promise<KnowledgeEntry[]>;
  remove(id: string): Promise<void>;
  update(id: string, draft: KnowledgeEntryDraft): Promise<KnowledgeEntry>;
}
