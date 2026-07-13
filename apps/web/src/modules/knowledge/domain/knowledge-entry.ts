/** Knowledge record contract shared with the API boundary. */
export interface KnowledgeEntry {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Attributes a user provides when creating or editing an entry. */
export interface KnowledgeEntryDraft {
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
}
