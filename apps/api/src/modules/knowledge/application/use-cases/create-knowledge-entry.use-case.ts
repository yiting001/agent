import type {
  KnowledgeEntry,
  KnowledgeEntryDraft,
} from '../../domain/knowledge-entry';
import type { KnowledgeEntryRepository } from '../ports/knowledge-entry.repository';

/** Persists a new knowledge entry from a validated draft. */
export class CreateKnowledgeEntryUseCase {
  constructor(private readonly repository: KnowledgeEntryRepository) {}

  execute(draft: KnowledgeEntryDraft): Promise<KnowledgeEntry> {
    return this.repository.create(draft);
  }
}
