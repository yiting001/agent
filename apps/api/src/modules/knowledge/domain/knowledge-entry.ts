/** Length limits shared by validation, persistence and the public API. */
export const KNOWLEDGE_TITLE_MAX_LENGTH = 200;
export const KNOWLEDGE_CONTENT_MAX_LENGTH = 20_000;
export const KNOWLEDGE_TAG_MAX_LENGTH = 40;
export const KNOWLEDGE_TAGS_MAX_COUNT = 10;

/** Core knowledge record exposed at the application boundary. */
export interface KnowledgeEntry {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Attributes callers provide when creating an entry. */
export interface KnowledgeEntryDraft {
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
}

/** Attributes callers may change when editing an entry. */
export type KnowledgeEntryChanges = Partial<KnowledgeEntryDraft>;
