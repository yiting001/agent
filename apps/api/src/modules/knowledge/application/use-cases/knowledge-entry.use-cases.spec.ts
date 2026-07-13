import type {
  KnowledgeEntry,
  KnowledgeEntryChanges,
  KnowledgeEntryDraft,
} from '../../domain/knowledge-entry';
import { KnowledgeEntryNotFoundError } from '../../domain/knowledge-entry-not-found.error';
import type { KnowledgeEntryRepository } from '../ports/knowledge-entry.repository';
import { CreateKnowledgeEntryUseCase } from './create-knowledge-entry.use-case';
import { DeleteKnowledgeEntryUseCase } from './delete-knowledge-entry.use-case';
import { GetKnowledgeEntryUseCase } from './get-knowledge-entry.use-case';
import { ListKnowledgeEntriesUseCase } from './list-knowledge-entries.use-case';
import { UpdateKnowledgeEntryUseCase } from './update-knowledge-entry.use-case';

/** Deterministic in-memory adapter used to isolate use case rules. */
class InMemoryKnowledgeEntryRepository implements KnowledgeEntryRepository {
  private readonly entries = new Map<string, KnowledgeEntry>();
  private sequence = 0;

  create(draft: KnowledgeEntryDraft): Promise<KnowledgeEntry> {
    this.sequence += 1;

    const entry: KnowledgeEntry = {
      content: draft.content,
      createdAt: '2026-01-01T00:00:00.000Z',
      id: `entry-${this.sequence}`,
      tags: draft.tags,
      title: draft.title,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    this.entries.set(entry.id, entry);

    return Promise.resolve(entry);
  }

  deleteById(id: string): Promise<boolean> {
    return Promise.resolve(this.entries.delete(id));
  }

  findAll(): Promise<KnowledgeEntry[]> {
    return Promise.resolve([...this.entries.values()]);
  }

  findById(id: string): Promise<KnowledgeEntry | null> {
    return Promise.resolve(this.entries.get(id) ?? null);
  }

  update(
    id: string,
    changes: KnowledgeEntryChanges,
  ): Promise<KnowledgeEntry | null> {
    const entry = this.entries.get(id);

    if (!entry) {
      return Promise.resolve(null);
    }

    const updated: KnowledgeEntry = { ...entry, ...changes };

    this.entries.set(id, updated);

    return Promise.resolve(updated);
  }
}

const draft: KnowledgeEntryDraft = {
  content: '领域层不得依赖框架。',
  tags: ['架构'],
  title: 'DDD 分层约定',
};

describe('Knowledge entry use cases', () => {
  let repository: InMemoryKnowledgeEntryRepository;

  beforeEach(() => {
    repository = new InMemoryKnowledgeEntryRepository();
  });

  it('creates entries that later appear in the list', async () => {
    const created = await new CreateKnowledgeEntryUseCase(repository).execute(
      draft,
    );

    expect(created.title).toBe(draft.title);
    await expect(
      new ListKnowledgeEntriesUseCase(repository).execute(),
    ).resolves.toEqual([created]);
  });

  it('reads a stored entry and rejects unknown identifiers', async () => {
    const created = await new CreateKnowledgeEntryUseCase(repository).execute(
      draft,
    );
    const getEntry = new GetKnowledgeEntryUseCase(repository);

    await expect(getEntry.execute(created.id)).resolves.toEqual(created);
    await expect(getEntry.execute('missing')).rejects.toBeInstanceOf(
      KnowledgeEntryNotFoundError,
    );
  });

  it('applies partial updates and rejects unknown identifiers', async () => {
    const created = await new CreateKnowledgeEntryUseCase(repository).execute(
      draft,
    );
    const updateEntry = new UpdateKnowledgeEntryUseCase(repository);
    const updated = await updateEntry.execute(created.id, { title: '新标题' });

    expect(updated.title).toBe('新标题');
    expect(updated.content).toBe(draft.content);
    await expect(
      updateEntry.execute('missing', { title: '新标题' }),
    ).rejects.toBeInstanceOf(KnowledgeEntryNotFoundError);
  });

  it('deletes a stored entry and rejects unknown identifiers', async () => {
    const created = await new CreateKnowledgeEntryUseCase(repository).execute(
      draft,
    );
    const deleteEntry = new DeleteKnowledgeEntryUseCase(repository);

    await expect(deleteEntry.execute(created.id)).resolves.toBeUndefined();
    await expect(deleteEntry.execute(created.id)).rejects.toBeInstanceOf(
      KnowledgeEntryNotFoundError,
    );
  });
});
