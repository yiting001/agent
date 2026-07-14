import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';

import type { ApplicationConfig } from '../../../../config/application.config';
import { ApplicationError } from '../../../../shared/application/application-error';
import {
  assertVector,
  ensureVectorCollection,
  serializeVector,
  vectorCollectionDefinition,
  vectorOperatorClass,
  type VectorCollectionDefinition,
} from '../../../../shared/infrastructure/postgres/pgvector-schema';
import {
  type KnowledgeSearchResult,
  type KnowledgeVectorPoint,
  VectorIndex,
} from '../../application/vector-index';
import type { KnowledgeBase } from '../../domain/knowledge';

interface KnowledgeVectorRow {
  content: string;
  documentId: string;
  fileName: string;
  moduleId: string;
  score: number;
}

@Injectable()
export class PgvectorVectorIndex extends VectorIndex {
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

  async deleteDocuments(
    knowledgeBase: KnowledgeBase,
    documentIds: string[],
  ): Promise<void> {
    if (documentIds.length === 0 || !(await this.exists(knowledgeBase))) {
      return;
    }

    const definition = vectorCollectionDefinition(
      'knowledge',
      knowledgeBase.embeddingDimensions,
    );

    try {
      await this.dataSource.query(
        `
          DELETE FROM "${definition.tableName}"
          WHERE "knowledgeBaseId" = $1 AND "documentId" = ANY($2::text[])
        `,
        [knowledgeBase.id, documentIds],
      );
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  async dropCollection(knowledgeBase: KnowledgeBase): Promise<void> {
    if (!(await this.exists(knowledgeBase))) {
      return;
    }

    const definition = vectorCollectionDefinition(
      'knowledge',
      knowledgeBase.embeddingDimensions,
    );

    try {
      await this.dataSource.query(
        `DELETE FROM "${definition.tableName}" WHERE "knowledgeBaseId" = $1`,
        [knowledgeBase.id],
      );
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  async ensureCollection(knowledgeBase: KnowledgeBase): Promise<void> {
    const definition = vectorCollectionDefinition(
      'knowledge',
      knowledgeBase.embeddingDimensions,
    );

    try {
      await ensureVectorCollection(
        this.dataSource,
        definition,
        (manager, current) => this.createSchema(manager, current),
      );
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  async search(
    knowledgeBase: KnowledgeBase,
    moduleIds: string[],
    vector: number[],
    limit: number,
  ): Promise<KnowledgeSearchResult[]> {
    if (moduleIds.length === 0 || !(await this.exists(knowledgeBase))) {
      return [];
    }

    assertVector(vector, knowledgeBase.embeddingDimensions);
    const definition = vectorCollectionDefinition(
      'knowledge',
      knowledgeBase.embeddingDimensions,
    );

    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.query(`SET LOCAL hnsw.ef_search = ${this.efSearch}`);
        const rows = await manager.query<KnowledgeVectorRow[]>(
          `
            SELECT
              "content",
              "documentId",
              "fileName",
              "moduleId",
              1 - ("embedding" <=> $1) AS "score"
            FROM "${definition.tableName}"
            WHERE
              "knowledgeBaseId" = $2
              AND "moduleId" = ANY($3::text[])
            ORDER BY "embedding" <=> $1
            LIMIT $4
          `,
          [serializeVector(vector), knowledgeBase.id, moduleIds, limit],
        );

        return rows.map((row) => ({ ...row, score: Number(row.score) }));
      });
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  async upsert(
    knowledgeBase: KnowledgeBase,
    points: KnowledgeVectorPoint[],
  ): Promise<void> {
    if (points.length === 0) {
      return;
    }

    for (const point of points) {
      assertVector(point.vector, knowledgeBase.embeddingDimensions);
    }

    await this.ensureCollection(knowledgeBase);
    const definition = vectorCollectionDefinition(
      'knowledge',
      knowledgeBase.embeddingDimensions,
    );

    try {
      for (
        let offset = 0;
        offset < points.length;
        offset += this.upsertBatchSize
      ) {
        await this.upsertBatch(
          definition,
          knowledgeBase.id,
          points.slice(offset, offset + this.upsertBatchSize),
        );
      }
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  private async createSchema(
    manager: EntityManager,
    definition: VectorCollectionDefinition,
  ): Promise<void> {
    await manager.query(`
      CREATE TABLE IF NOT EXISTS "${definition.tableName}" (
        "id" text PRIMARY KEY NOT NULL,
        "knowledgeBaseId" text NOT NULL,
        "moduleId" text NOT NULL,
        "documentId" text NOT NULL,
        "fileName" text NOT NULL,
        "content" text NOT NULL,
        "chunkIndex" integer NOT NULL,
        "embedding" ${definition.storageType}(${definition.dimensions}) NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL
      )
    `);
    await manager.query(`
      CREATE INDEX IF NOT EXISTS "IDX_${definition.tableName}_scope"
      ON "${definition.tableName}" ("knowledgeBaseId", "moduleId")
    `);
    await manager.query(`
      CREATE INDEX IF NOT EXISTS "IDX_${definition.tableName}_document"
      ON "${definition.tableName}" ("documentId")
    `);
    await manager.query(`
      CREATE INDEX IF NOT EXISTS "IDX_${definition.tableName}_embedding"
      ON "${definition.tableName}"
      USING hnsw ("embedding" ${vectorOperatorClass(definition.storageType)})
      WITH (m = ${this.hnswM}, ef_construction = ${this.efConstruction})
    `);
  }

  private async exists(knowledgeBase: KnowledgeBase): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ '?column?': number }>>(
      `
        SELECT 1
        FROM "vector_collections"
        WHERE "kind" = 'knowledge' AND "dimensions" = $1
      `,
      [knowledgeBase.embeddingDimensions],
    );

    return rows.length > 0;
  }

  private unavailable(error: unknown): ApplicationError {
    void error;

    return new ApplicationError(
      'service_unavailable',
      'PostgreSQL pgvector 知识索引暂时不可用。',
    );
  }

  private async upsertBatch(
    definition: VectorCollectionDefinition,
    knowledgeBaseId: string,
    points: KnowledgeVectorPoint[],
  ): Promise<void> {
    const values: unknown[] = [];
    const rows = points.map((point, index) => {
      const start = index * 9;

      values.push(
        point.id,
        knowledgeBaseId,
        point.moduleId,
        point.documentId,
        point.fileName,
        point.content,
        point.chunkIndex,
        serializeVector(point.vector),
        new Date(),
      );

      return `(${Array.from({ length: 9 }, (_, item) => `$${start + item + 1}`).join(', ')})`;
    });

    await this.dataSource.query(
      `
        INSERT INTO "${definition.tableName}" (
          "id", "knowledgeBaseId", "moduleId", "documentId", "fileName",
          "content", "chunkIndex", "embedding", "updatedAt"
        )
        VALUES ${rows.join(', ')}
        ON CONFLICT ("id") DO UPDATE SET
          "knowledgeBaseId" = EXCLUDED."knowledgeBaseId",
          "moduleId" = EXCLUDED."moduleId",
          "documentId" = EXCLUDED."documentId",
          "fileName" = EXCLUDED."fileName",
          "content" = EXCLUDED."content",
          "chunkIndex" = EXCLUDED."chunkIndex",
          "embedding" = EXCLUDED."embedding",
          "updatedAt" = EXCLUDED."updatedAt"
      `,
      values,
    );
  }
}
