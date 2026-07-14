import pgvector from 'pgvector';
import type { DataSource, EntityManager } from 'typeorm';

export type VectorCollectionKind = 'agent_memory' | 'knowledge';
export type VectorStorageType = 'halfvec' | 'vector';

const MAX_HNSW_DIMENSIONS = 4_000;
const MAX_VECTOR_DIMENSIONS = 2_000;

export interface VectorCollectionDefinition {
  dimensions: number;
  kind: VectorCollectionKind;
  storageType: VectorStorageType;
  tableName: string;
}

export function assertVector(vector: number[], dimensions: number): void {
  if (
    vector.length !== dimensions ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(`向量必须包含 ${dimensions} 个有限数值。`);
  }
}

export function serializeVector(vector: number[]): string {
  const serialized: unknown = pgvector.toSql(vector);

  if (typeof serialized !== 'string') {
    throw new Error('pgvector 序列化返回了无效结果。');
  }

  return serialized;
}

export function vectorCollectionDefinition(
  kind: VectorCollectionKind,
  dimensions: number,
): VectorCollectionDefinition {
  if (
    !Number.isSafeInteger(dimensions) ||
    dimensions < 1 ||
    dimensions > MAX_HNSW_DIMENSIONS
  ) {
    throw new Error(`pgvector HNSW 仅支持 1-${MAX_HNSW_DIMENSIONS} 维向量。`);
  }

  return {
    dimensions,
    kind,
    storageType: dimensions > MAX_VECTOR_DIMENSIONS ? 'halfvec' : 'vector',
    tableName: `${kind}_vectors_d${dimensions}`,
  };
}

export function vectorOperatorClass(storageType: VectorStorageType): string {
  return `${storageType}_cosine_ops`;
}

export async function ensureVectorCollection(
  dataSource: DataSource,
  definition: VectorCollectionDefinition,
  createSchema: (
    manager: EntityManager,
    definition: VectorCollectionDefinition,
  ) => Promise<void>,
): Promise<void> {
  await dataSource.transaction(async (manager) => {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1), $2)', [
      definition.kind,
      definition.dimensions,
    ]);
    const existing = await manager.query<Array<{ storageType: string }>>(
      `
        SELECT "storageType"
        FROM "vector_collections"
        WHERE "kind" = $1 AND "dimensions" = $2
      `,
      [definition.kind, definition.dimensions],
    );

    if (existing[0]) {
      if (existing[0].storageType !== definition.storageType) {
        throw new Error('向量集合存储类型与当前配置不一致。');
      }

      const tableRows = await manager.query<
        Array<{ tableName: string | null }>
      >('SELECT to_regclass($1) AS "tableName"', [definition.tableName]);

      if (!tableRows[0]?.tableName) {
        await createSchema(manager, definition);
      }

      return;
    }

    await createSchema(manager, definition);
    await manager.query(
      `
        INSERT INTO "vector_collections"
          ("kind", "dimensions", "storageType", "createdAt")
        VALUES ($1, $2, $3, $4)
      `,
      [
        definition.kind,
        definition.dimensions,
        definition.storageType,
        new Date(),
      ],
    );
  });
}

export async function listVectorDimensions(
  dataSource: DataSource,
  kind: VectorCollectionKind,
): Promise<number[]> {
  const rows = await dataSource.query<Array<{ dimensions: number }>>(
    `
      SELECT "dimensions"
      FROM "vector_collections"
      WHERE "kind" = $1
      ORDER BY "dimensions" ASC
    `,
    [kind],
  );

  return rows.map((row) => row.dimensions);
}
