import type { KnowledgeEntry } from '../../domain/knowledge-entry';
import { KnowledgeEntryNotFoundError } from '../../domain/knowledge-entry-not-found.error';
import type { KnowledgeEntryRepository } from '../ports/knowledge-entry.repository';

/** Loads a single knowledge entry or fails with a domain error. */
export class GetKnowledgeEntryUseCase {
  constructor(private readonly repository: KnowledgeEntryRepository) {}

  async execute(id: string): Promise<KnowledgeEntry> {
    const entry = await this.repository.findById(id);

    if (!entry) {
      throw new KnowledgeEntryNotFoundError(id);
    }

    return entry;
  }
}
