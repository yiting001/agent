import { assertVector, vectorCollectionDefinition } from './pgvector-schema';
import { unwrapPostgresRows } from './postgres-query-result';

describe('pgvector schema', () => {
  it('selects vector and halfvec within HNSW limits', () => {
    expect(vectorCollectionDefinition('knowledge', 2_000)).toEqual(
      expect.objectContaining({
        storageType: 'vector',
        tableName: 'knowledge_vectors_d2000',
      }),
    );
    expect(vectorCollectionDefinition('agent_memory', 2_001)).toEqual(
      expect.objectContaining({
        storageType: 'halfvec',
        tableName: 'agent_memory_vectors_d2001',
      }),
    );
    expect(() => vectorCollectionDefinition('knowledge', 4_001)).toThrow(
      'pgvector HNSW 仅支持 1-4000 维向量。',
    );
  });

  it('validates vector dimensions and finite values', () => {
    expect(() => assertVector([0.1, 0.2], 2)).not.toThrow();
    expect(() => assertVector([0.1], 2)).toThrow('向量必须包含 2 个有限数值。');
    expect(() => assertVector([0.1, Number.NaN], 2)).toThrow(
      '向量必须包含 2 个有限数值。',
    );
  });

  it('unwraps PostgreSQL returning rows', () => {
    expect(
      unwrapPostgresRows<{ id: string }>([[{ id: 'task-id' }], 1]),
    ).toEqual([{ id: 'task-id' }]);
    expect(unwrapPostgresRows<{ id: string }>([{ id: 'task-id' }])).toEqual([
      { id: 'task-id' },
    ]);
  });
});
