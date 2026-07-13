import type {
  KnowledgeEntry,
  KnowledgeEntryChanges,
} from '../../domain/knowledge-entry';
import { KnowledgeEntryNotFoundError } from '../../domain/knowledge-entry-not-found.error';
import type { KnowledgeEntryRepository } from '../ports/knowledge-entry.repository';

/** Applies partial changes to an existing knowledge entry. */
export class UpdateKnowledgeEntryUseCase {
  constructor(private readonly repository: KnowledgeEntryRepository) {}

  async execute(
    id: string,
    changes: KnowledgeEntryChanges,
  ): Promise<KnowledgeEntry> {
    const entry = await this.repository.update(id, changes);

    if (!entry) {
      throw new KnowledgeEntryNotFoundError(id);
    }

    return entry;
  }
}
