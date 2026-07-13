import type { HttpClient } from '@/shared/http/http-client';

import type { KnowledgeEntryGateway } from '../application/knowledge-entry.gateway';
import type {
  KnowledgeEntry,
  KnowledgeEntryDraft,
} from '../domain/knowledge-entry';

const KNOWLEDGE_ENTRIES_PATH = '/knowledge-entries';

function isKnowledgeEntry(value: unknown): value is KnowledgeEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.content === 'string' &&
    Array.isArray(candidate.tags) &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}

function assertKnowledgeEntry(value: unknown): KnowledgeEntry {
  if (!isKnowledgeEntry(value)) {
    throw new Error('The knowledge API returned an invalid entry.');
  }

  return value;
}

/** Maps the knowledge entry HTTP resource into the feature contract. */
export class HttpKnowledgeEntryGateway implements KnowledgeEntryGateway {
  constructor(private readonly httpClient: HttpClient) {}

  async create(draft: KnowledgeEntryDraft): Promise<KnowledgeEntry> {
    return assertKnowledgeEntry(
      await this.httpClient.post(KNOWLEDGE_ENTRIES_PATH, draft),
    );
  }

  async list(): Promise<KnowledgeEntry[]> {
    const response = await this.httpClient.get(KNOWLEDGE_ENTRIES_PATH);

    if (!Array.isArray(response)) {
      throw new Error('The knowledge API returned an invalid list.');
    }

    return response.map(assertKnowledgeEntry);
  }

  async remove(id: string): Promise<void> {
    await this.httpClient.delete(`${KNOWLEDGE_ENTRIES_PATH}/${id}`);
  }

  async update(
    id: string,
    draft: KnowledgeEntryDraft,
  ): Promise<KnowledgeEntry> {
    return assertKnowledgeEntry(
      await this.httpClient.put(`${KNOWLEDGE_ENTRIES_PATH}/${id}`, draft),
    );
  }
}
