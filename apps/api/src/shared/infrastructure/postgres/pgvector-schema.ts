import pgvector from 'pgvector';
import type { DataSource, EntityManager } from 'typeorm';

/** 共享 pgvector 元数据表中登记的业务集合类型。 */
export type VectorCollectionKind = 'agent_memory' | 'knowledge';
/** 根据维度选择的 pgvector 存储类型。 */
export type VectorStorageType = 'halfvec' | 'vector';

const MAX_HNSW_DIMENSIONS = 4_000;
const MAX_VECTOR_DIMENSIONS = 2_000;

/** 一个按业务类型和维度隔离的物理向量集合。 */
export interface VectorCollectionDefinition {
  dimensions: number;
  kind: VectorCollectionKind;
  storageType: VectorStorageType;
  tableName: string;
}

/** 校验向量维度和数值有限性，防止无效数据进入 pgvector。 */
export function assertVector(vector: number[], dimensions: number): void {
  if (
    vector.length !== dimensions ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(`向量必须包含 ${dimensions} 个有限数值。`);
  }
}

/** 使用 pgvector 官方编码器生成参数化 SQL 可接受的向量文本。 */
export function serializeVector(vector: number[]): string {
  const serialized: unknown = pgvector.toSql(vector);

  if (typeof serialized !== 'string') {
    throw new Error('pgvector 序列化返回了无效结果。');
  }

  return serialized;
}

/** 根据 HNSW 维度限制选择 vector 或 halfvec 物理表。 */
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

/** 返回与存储类型匹配的余弦距离操作符类。 */
export function vectorOperatorClass(storageType: VectorStorageType): string {
  return `${storageType}_cosine_ops`;
}

/**
 * 并发安全地初始化向量集合。
 * 事务级 advisory lock 保证多个实例不会同时建同一张维度表。
 */
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

/** 列出指定业务集合已初始化的全部向量维度。 */
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
