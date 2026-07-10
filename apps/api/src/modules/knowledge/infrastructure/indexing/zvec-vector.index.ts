import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ZVecCollectionSchema,
  ZVecCreateAndOpen,
  ZVecDataType,
  ZVecIndexType,
  ZVecMetricType,
  ZVecOpen,
  type ZVecCollection,
  type ZVecDoc,
  type ZVecStatus,
} from '@zvec/zvec';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type {
  ApplicationConfig,
  ZvecIndexType,
} from '../../../../config/application.config';
import { ApplicationError } from '../../../../shared/application/application-error';
import {
  type KnowledgeSearchResult,
  type KnowledgeVectorPoint,
  VectorIndex,
} from '../../application/vector-index';
import type { KnowledgeBase } from '../../domain/knowledge';

const VECTOR_FIELD = 'embedding';
const CONTENT_FIELD = 'content';
const DOCUMENT_ID_FIELD = 'documentId';
const FILE_NAME_FIELD = 'fileName';
const MODULE_ID_FIELD = 'moduleId';
const CHUNK_INDEX_FIELD = 'chunkIndex';

function readString(
  fields: Record<string, unknown>,
  fieldName: string,
): string | undefined {
  const value = fields[fieldName];

  return typeof value === 'string' ? value : undefined;
}

@Injectable()
export class ZvecVectorIndex
  extends VectorIndex
  implements OnApplicationShutdown
{
  private readonly collectionPrefix: string;
  private readonly collections = new Map<string, ZVecCollection>();
  private readonly dataPath: string;
  private readonly indexType: ZvecIndexType;
  private readonly upsertBatchSize: number;

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.collectionPrefix = config.zvecCollectionPrefix;
    this.dataPath = resolve(config.zvecDataPath);
    this.indexType = config.zvecIndexType;
    this.upsertBatchSize = config.zvecUpsertBatchSize;
    mkdirSync(this.dataPath, { recursive: true });
  }

  ensureCollection(knowledgeBase: KnowledgeBase): Promise<void> {
    try {
      this.getOrCreateCollection(knowledgeBase);

      return Promise.resolve();
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  onApplicationShutdown(): void {
    for (const collection of this.collections.values()) {
      collection.closeSync();
    }

    this.collections.clear();
  }

  async search(
    knowledgeBase: KnowledgeBase,
    moduleIds: string[],
    vector: number[],
    limit: number,
  ): Promise<KnowledgeSearchResult[]> {
    if (moduleIds.length === 0) {
      return [];
    }

    try {
      const collection = this.openCollection(knowledgeBase);

      if (!collection) {
        return [];
      }

      const documents = await collection.query({
        fieldName: VECTOR_FIELD,
        filter: this.moduleFilter(moduleIds),
        outputFields: [
          CONTENT_FIELD,
          DOCUMENT_ID_FIELD,
          FILE_NAME_FIELD,
          MODULE_ID_FIELD,
        ],
        topk: limit,
        vector,
      });

      return documents.flatMap((document) => this.toSearchResult(document));
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

    try {
      const collection = this.getOrCreateCollection(knowledgeBase);

      for (
        let offset = 0;
        offset < points.length;
        offset += this.upsertBatchSize
      ) {
        const batch = points
          .slice(offset, offset + this.upsertBatchSize)
          .map((point) => ({
            fields: {
              [CHUNK_INDEX_FIELD]: point.chunkIndex,
              [CONTENT_FIELD]: point.content,
              [DOCUMENT_ID_FIELD]: point.documentId,
              [FILE_NAME_FIELD]: point.fileName,
              [MODULE_ID_FIELD]: point.moduleId,
            },
            id: point.id,
            vectors: {
              [VECTOR_FIELD]: point.vector,
            },
          }));

        this.assertStatuses(collection.upsertSync(batch));
        await new Promise<void>((resolveBatch) => {
          setImmediate(resolveBatch);
        });
      }

      await collection.optimize();
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  private assertStatuses(statuses: ZVecStatus[]): void {
    const failed = statuses.find((status) => !status.ok);

    if (failed) {
      throw new Error(`${failed.code}: ${failed.message}`);
    }
  }

  private collectionName(knowledgeBaseId: string): string {
    return `${this.collectionPrefix}_${knowledgeBaseId.replaceAll('-', '_')}`;
  }

  private collectionPath(knowledgeBaseId: string): string {
    return resolve(this.dataPath, this.collectionName(knowledgeBaseId));
  }

  private createCollection(knowledgeBase: KnowledgeBase): ZVecCollection {
    const schema = new ZVecCollectionSchema({
      fields: [
        {
          dataType: ZVecDataType.STRING,
          indexParams: {
            indexType: ZVecIndexType.INVERT,
          },
          name: MODULE_ID_FIELD,
        },
        { dataType: ZVecDataType.STRING, name: DOCUMENT_ID_FIELD },
        { dataType: ZVecDataType.STRING, name: FILE_NAME_FIELD },
        { dataType: ZVecDataType.STRING, name: CONTENT_FIELD },
        { dataType: ZVecDataType.INT32, name: CHUNK_INDEX_FIELD },
      ],
      name: this.collectionName(knowledgeBase.id),
      vectors: {
        dataType: ZVecDataType.VECTOR_FP32,
        dimension: knowledgeBase.embeddingDimensions,
        indexParams: this.vectorIndexParams(),
        name: VECTOR_FIELD,
      },
    });

    return ZVecCreateAndOpen(this.collectionPath(knowledgeBase.id), schema, {
      enableMMAP: true,
    });
  }

  private getOrCreateCollection(knowledgeBase: KnowledgeBase): ZVecCollection {
    const cached = this.collections.get(knowledgeBase.id);

    if (cached) {
      this.validateDimensions(cached, knowledgeBase);

      return cached;
    }

    const collection =
      this.openCollection(knowledgeBase) ??
      this.createCollection(knowledgeBase);

    this.collections.set(knowledgeBase.id, collection);

    return collection;
  }

  private moduleFilter(moduleIds: string[]): string {
    const values = moduleIds
      .map((moduleId) => `'${moduleId.replaceAll("'", "''")}'`)
      .join(', ');

    return `${MODULE_ID_FIELD} IN (${values})`;
  }

  private openCollection(
    knowledgeBase: KnowledgeBase,
  ): ZVecCollection | undefined {
    const cached = this.collections.get(knowledgeBase.id);

    if (cached) {
      this.validateDimensions(cached, knowledgeBase);

      return cached;
    }

    const path = this.collectionPath(knowledgeBase.id);

    if (!existsSync(path)) {
      return undefined;
    }

    const collection = ZVecOpen(path, { enableMMAP: true });

    this.validateDimensions(collection, knowledgeBase);
    this.collections.set(knowledgeBase.id, collection);

    return collection;
  }

  private toSearchResult(document: ZVecDoc): KnowledgeSearchResult[] {
    const fields: Record<string, unknown> = document.fields;
    const content = readString(fields, CONTENT_FIELD);
    const documentId = readString(fields, DOCUMENT_ID_FIELD);
    const fileName = readString(fields, FILE_NAME_FIELD);
    const moduleId = readString(fields, MODULE_ID_FIELD);

    if (!content || !documentId || !fileName || !moduleId) {
      return [];
    }

    return [
      {
        content,
        documentId,
        fileName,
        moduleId,
        score: document.score,
      },
    ];
  }

  private unavailable(error: unknown): ApplicationError {
    const detail = error instanceof Error ? error.message : '未知错误';

    return new ApplicationError(
      'service_unavailable',
      `Zvec 向量索引不可用：${detail}`,
    );
  }

  private vectorIndexParams():
    | {
        indexType: typeof ZVecIndexType.DISKANN;
        metricType: typeof ZVecMetricType.COSINE;
      }
    | {
        indexType: typeof ZVecIndexType.HNSW;
        metricType: typeof ZVecMetricType.COSINE;
      } {
    return this.indexType === 'diskann'
      ? {
          indexType: ZVecIndexType.DISKANN,
          metricType: ZVecMetricType.COSINE,
        }
      : {
          indexType: ZVecIndexType.HNSW,
          metricType: ZVecMetricType.COSINE,
        };
  }

  private validateDimensions(
    collection: ZVecCollection,
    knowledgeBase: KnowledgeBase,
  ): void {
    const vectorSchema = collection.schema.vector(VECTOR_FIELD);

    if (vectorSchema.dimension !== knowledgeBase.embeddingDimensions) {
      throw new Error(
        `知识库向量维度为 ${knowledgeBase.embeddingDimensions}，现有索引维度为 ${vectorSchema.dimension ?? 0}`,
      );
    }
  }
}
