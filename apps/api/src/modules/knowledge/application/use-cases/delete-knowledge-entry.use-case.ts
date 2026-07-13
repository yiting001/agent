import { KnowledgeEntryNotFoundError } from '../../domain/knowledge-entry-not-found.error';
import type { KnowledgeEntryRepository } from '../ports/knowledge-entry.repository';

/** Removes a knowledge entry or fails when it does not exist. */
export class DeleteKnowledgeEntryUseCase {
  constructor(private readonly repository: KnowledgeEntryRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.repository.deleteById(id);

    if (!deleted) {
      throw new KnowledgeEntryNotFoundError(id);
    }
  }
}
