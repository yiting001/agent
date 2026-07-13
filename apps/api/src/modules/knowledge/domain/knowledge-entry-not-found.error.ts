/** Raised when a requested knowledge entry does not exist. */
export class KnowledgeEntryNotFoundError extends Error {
  constructor(readonly entryId: string) {
    super(`Knowledge entry ${entryId} was not found.`);
    this.name = 'KnowledgeEntryNotFoundError';
  }
}
