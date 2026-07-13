import type { KnowledgeEntry } from '../../domain/knowledge-entry';
import type { KnowledgeEntryRepository } from '../ports/knowledge-entry.repository';

/** Returns every stored knowledge entry for management screens. */
export class ListKnowledgeEntriesUseCase {
  constructor(private readonly repository: KnowledgeEntryRepository) {}

  execute(): Promise<KnowledgeEntry[]> {
    return this.repository.findAll();
  }
}
