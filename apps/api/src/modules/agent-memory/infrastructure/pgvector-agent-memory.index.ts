import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';

import type { ApplicationConfig } from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import {
  assertVector,
  ensureVectorCollection,
  listVectorDimensions,
  serializeVector,
  vectorCollectionDefinition,
  vectorOperatorClass,
  type VectorCollectionDefinition,
} from '../../../shared/infrastructure/postgres/pgvector-schema';
import {
  AgentMemoryIndex,
  type AgentMemoryIndexSearchResult,
  type IndexedAgentMemory,
} from '../application/agent-memory.index';

interface AgentMemoryVectorRow {
  content: string;
  memoryId: string;
  score: number;
}

/** 按 agentId、ownerKey 和维度隔离的情景记忆 pgvector 索引。 */
@Injectable()
export class PgvectorAgentMemoryIndex extends AgentMemoryIndex {
  private readonly efConstruction: number;
  private readonly efSearch: number;
  private readonly hnswM: number;
  private readonly upsertBatchSize: number;

  constructor(
    configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.efConstruction = config.vectorHnswEfConstruction;
    this.efSearch = config.vectorHnswEfSearch;
    this.hnswM = config.vectorHnswM;
    this.upsertBatchSize = config.vectorUpsertBatchSize;
  }

  /** 跨全部维度表清除指定 owner 范围的向量。 */
  async clear(agentId: string, ownerKey: string): Promise<void> {
    try {
      for (const dimensions of await listVectorDimensions(
        this.dataSource,
        'agent_memory',
      )) {
        const definition = vectorCollectionDefinition(
          'agent_memory',
          dimensions,
        );

        await this.dataSource.query(
          `
            DELETE FROM "${definition.tableName}"
            WHERE "agentId" = $1 AND "ownerKey" = $2
          `,
          [agentId, ownerKey],
        );
      }
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  /** 跨全部维度表删除指定记忆向量。 */
  async delete(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) {
      return;
    }

    try {
      for (const dimensions of await listVectorDimensions(
        this.dataSource,
        'agent_memory',
      )) {
        const definition = vectorCollectionDefinition(
          'agent_memory',
          dimensions,
        );

        await this.dataSource.query(
          `DELETE FROM "${definition.tableName}" WHERE "memoryId" = ANY($1::text[])`,
          [memoryIds],
        );
      }
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  /** 跨全部已登记维度检查记忆是否已建立索引。 */
  async exists(memoryId: string): Promise<boolean> {
    try {
      for (const dimensions of await listVectorDimensions(
        this.dataSource,
        'agent_memory',
      )) {
        const definition = vectorCollectionDefinition(
          'agent_memory',
          dimensions,
        );
        const rows = await this.dataSource.query<Array<{ '?column?': number }>>(
          `SELECT 1 FROM "${definition.tableName}" WHERE "memoryId" = $1 LIMIT 1`,
          [memoryId],
        );

        if (rows.length > 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  /** 仅在 agentId + ownerKey 范围内执行余弦近邻检索。 */
  async search(input: {
    agentId: string;
    dimensions: number;
    limit: number;
    ownerKey: string;
    vector: number[];
  }): Promise<AgentMemoryIndexSearchResult[]> {
    assertVector(input.vector, input.dimensions);

    if (!(await this.collectionExists(input.dimensions))) {
      return [];
    }

    const definition = vectorCollectionDefinition(
      'agent_memory',
      input.dimensions,
    );

    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.query(`SET LOCAL hnsw.ef_search = ${this.efSearch}`);
        const rows = await manager.query<AgentMemoryVectorRow[]>(
          `
            SELECT
              "content",
              "memoryId",
              1 - ("embedding" <=> $1) AS "score"
            FROM "${definition.tableName}"
            WHERE "agentId" = $2 AND "ownerKey" = $3
            ORDER BY "embedding" <=> $1
            LIMIT $4
          `,
          [
            serializeVector(input.vector),
            input.agentId,
            input.ownerKey,
            input.limit,
          ],
        );

        return rows.map((row) => ({ ...row, score: Number(row.score) }));
      });
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  /** 并发安全建表后按配置批量写入记忆向量。 */
  async upsert(
    dimensions: number,
    memories: IndexedAgentMemory[],
  ): Promise<void> {
    if (memories.length === 0) {
      return;
    }

    for (const memory of memories) {
      assertVector(memory.vector, dimensions);
    }

    const definition = vectorCollectionDefinition('agent_memory', dimensions);

    try {
      await ensureVectorCollection(
        this.dataSource,
        definition,
        (manager, current) => this.createSchema(manager, current),
      );

      for (
        let offset = 0;
        offset < memories.length;
        offset += this.upsertBatchSize
      ) {
        await this.upsertBatch(
          definition,
          memories.slice(offset, offset + this.upsertBatchSize),
        );
      }
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  private async collectionExists(dimensions: number): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ '?column?': number }>>(
      `
        SELECT 1
        FROM "vector_collections"
        WHERE "kind" = 'agent_memory' AND "dimensions" = $1
      `,
      [dimensions],
    );

    return rows.length > 0;
  }

  /** 创建 owner 复合范围索引和 HNSW 向量索引。 */
  private async createSchema(
    manager: EntityManager,
    definition: VectorCollectionDefinition,
  ): Promise<void> {
    await manager.query(`
      CREATE TABLE IF NOT EXISTS "${definition.tableName}" (
        "memoryId" text PRIMARY KEY NOT NULL,
        "agentId" text NOT NULL,
        "ownerKey" text NOT NULL,
        "content" text NOT NULL,
        "embedding" ${definition.storageType}(${definition.dimensions}) NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL
      )
    `);
    await manager.query(`
      CREATE INDEX IF NOT EXISTS "IDX_${definition.tableName}_scope"
      ON "${definition.tableName}" ("agentId", "ownerKey")
    `);
    await manager.query(`
      CREATE INDEX IF NOT EXISTS "IDX_${definition.tableName}_embedding"
      ON "${definition.tableName}"
      USING hnsw ("embedding" ${vectorOperatorClass(definition.storageType)})
      WITH (m = ${this.hnswM}, ef_construction = ${this.efConstruction})
    `);
  }

  /** 将数据库异常转换为不暴露实现细节的应用错误。 */
  private unavailable(error: unknown): ApplicationError {
    void error;

    return new ApplicationError(
      'service_unavailable',
      'PostgreSQL pgvector 情景记忆索引暂时不可用。',
    );
  }

  /** 使用参数化占位符批量 upsert，禁止业务值直接拼接 SQL。 */
  private async upsertBatch(
    definition: VectorCollectionDefinition,
    memories: IndexedAgentMemory[],
  ): Promise<void> {
    const values: unknown[] = [];
    const rows = memories.map((memory, index) => {
      const start = index * 6;

      values.push(
        memory.memoryId,
        memory.agentId,
        memory.ownerKey,
        memory.content,
        serializeVector(memory.vector),
        new Date(),
      );

      return `(${Array.from({ length: 6 }, (_, item) => `$${start + item + 1}`).join(', ')})`;
    });

    await this.dataSource.query(
      `
        INSERT INTO "${definition.tableName}" (
          "memoryId", "agentId", "ownerKey", "content", "embedding", "updatedAt"
        )
        VALUES ${rows.join(', ')}
        ON CONFLICT ("memoryId") DO UPDATE SET
          "agentId" = EXCLUDED."agentId",
          "ownerKey" = EXCLUDED."ownerKey",
          "content" = EXCLUDED."content",
          "embedding" = EXCLUDED."embedding",
          "updatedAt" = EXCLUDED."updatedAt"
      `,
      values,
    );
  }
}
