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
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type {
  ApplicationConfig,
  ZvecIndexType,
} from '../../../config/application.config';
import { ApplicationError } from '../../../shared/application/application-error';
import {
  AgentMemoryIndex,
  type AgentMemoryIndexSearchResult,
  type IndexedAgentMemory,
} from '../application/agent-memory.index';

const VECTOR_FIELD = 'embedding';
const AGENT_ID_FIELD = 'agentId';
const CONTENT_FIELD = 'content';
const MEMORY_ID_FIELD = 'memoryId';
const OWNER_KEY_FIELD = 'ownerKey';

function readString(
  fields: Record<string, unknown>,
  fieldName: string,
): string | undefined {
  const value = fields[fieldName];

  return typeof value === 'string' ? value : undefined;
}

function escapeFilterValue(value: string): string {
  return value.replaceAll("'", "''");
}

@Injectable()
export class ZvecAgentMemoryIndex
  extends AgentMemoryIndex
  implements OnApplicationShutdown
{
  private readonly collectionPrefix: string;
  private readonly collections = new Map<number, ZVecCollection>();
  private readonly dataPath: string;
  private readonly indexType: ZvecIndexType;

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.collectionPrefix = config.agentMemoryZvecCollectionPrefix;
    this.dataPath = resolve(config.zvecDataPath);
    this.indexType = config.zvecIndexType;
    mkdirSync(this.dataPath, { recursive: true });
  }

  async clear(agentId: string, ownerKey: string): Promise<void> {
    await this.deleteByFilter(
      `${AGENT_ID_FIELD} = '${escapeFilterValue(agentId)}' AND ` +
        `${OWNER_KEY_FIELD} = '${escapeFilterValue(ownerKey)}'`,
    );
  }

  async delete(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) {
      return;
    }

    const values = memoryIds
      .map((memoryId) => `'${escapeFilterValue(memoryId)}'`)
      .join(', ');

    await this.deleteByFilter(`${MEMORY_ID_FIELD} IN (${values})`);
  }

  exists(memoryId: string): Promise<boolean> {
    try {
      for (const dimensions of this.listDimensions()) {
        const collection = this.openCollection(dimensions);
        const found = collection?.fetchSync({
          ids: memoryId,
          includeVector: false,
          outputFields: [],
        });

        if (found && memoryId in found) {
          return Promise.resolve(true);
        }
      }

      return Promise.resolve(false);
    } catch (error) {
      return Promise.reject(this.unavailable(error));
    }
  }

  onApplicationShutdown(): void {
    for (const collection of this.collections.values()) {
      collection.closeSync();
    }

    this.collections.clear();
  }

  async search(input: {
    agentId: string;
    dimensions: number;
    limit: number;
    ownerKey: string;
    vector: number[];
  }): Promise<AgentMemoryIndexSearchResult[]> {
    try {
      const collection = this.openCollection(input.dimensions);

      if (!collection) {
        return [];
      }

      const documents = await collection.query({
        fieldName: VECTOR_FIELD,
        filter:
          `${AGENT_ID_FIELD} = '${escapeFilterValue(input.agentId)}' AND ` +
          `${OWNER_KEY_FIELD} = '${escapeFilterValue(input.ownerKey)}'`,
        outputFields: [CONTENT_FIELD, MEMORY_ID_FIELD],
        topk: input.limit,
        vector: input.vector,
      });

      return documents.flatMap((document) => this.toSearchResult(document));
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  async upsert(
    dimensions: number,
    memories: IndexedAgentMemory[],
  ): Promise<void> {
    if (memories.length === 0) {
      return;
    }

    try {
      const collection = this.getOrCreateCollection(dimensions);
      const statuses = collection.upsertSync(
        memories.map((memory) => ({
          fields: {
            [AGENT_ID_FIELD]: memory.agentId,
            [CONTENT_FIELD]: memory.content,
            [MEMORY_ID_FIELD]: memory.memoryId,
            [OWNER_KEY_FIELD]: memory.ownerKey,
          },
          id: memory.memoryId,
          vectors: { [VECTOR_FIELD]: memory.vector },
        })),
      );

      this.assertStatuses(statuses);
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

  private collectionName(dimensions: number): string {
    return `${this.collectionPrefix}_d${dimensions}`;
  }

  private collectionPath(dimensions: number): string {
    return resolve(this.dataPath, this.collectionName(dimensions));
  }

  private createCollection(dimensions: number): ZVecCollection {
    const schema = new ZVecCollectionSchema({
      fields: [
        {
          dataType: ZVecDataType.STRING,
          indexParams: { indexType: ZVecIndexType.INVERT },
          name: AGENT_ID_FIELD,
        },
        {
          dataType: ZVecDataType.STRING,
          indexParams: { indexType: ZVecIndexType.INVERT },
          name: OWNER_KEY_FIELD,
        },
        { dataType: ZVecDataType.STRING, name: MEMORY_ID_FIELD },
        { dataType: ZVecDataType.STRING, name: CONTENT_FIELD },
      ],
      name: this.collectionName(dimensions),
      vectors: {
        dataType: ZVecDataType.VECTOR_FP32,
        dimension: dimensions,
        indexParams: this.vectorIndexParams(),
        name: VECTOR_FIELD,
      },
    });

    return ZVecCreateAndOpen(this.collectionPath(dimensions), schema, {
      enableMMAP: true,
    });
  }

  private async deleteByFilter(filter: string): Promise<void> {
    try {
      for (const dimensions of this.listDimensions()) {
        const collection = this.openCollection(dimensions);

        if (collection) {
          this.assertStatuses([await collection.deleteByFilter(filter)]);
        }
      }
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  private getOrCreateCollection(dimensions: number): ZVecCollection {
    const collection =
      this.openCollection(dimensions) ?? this.createCollection(dimensions);

    this.collections.set(dimensions, collection);

    return collection;
  }

  private listDimensions(): number[] {
    const pattern = new RegExp(`^${this.collectionPrefix}_d(\\d+)$`);
    const dimensions = readdirSync(this.dataPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const value = Number(pattern.exec(entry.name)?.[1]);

        return Number.isSafeInteger(value) && value > 0 ? [value] : [];
      });

    return [...new Set([...this.collections.keys(), ...dimensions])];
  }

  private openCollection(dimensions: number): ZVecCollection | undefined {
    const cached = this.collections.get(dimensions);

    if (cached) {
      return cached;
    }

    const path = this.collectionPath(dimensions);

    if (!existsSync(path)) {
      return undefined;
    }

    const collection = ZVecOpen(path, { enableMMAP: true });
    const schema = collection.schema.vector(VECTOR_FIELD);

    if (schema.dimension !== dimensions) {
      collection.closeSync();
      throw new Error(
        `情景记忆向量维度为 ${dimensions}，现有索引维度为 ${schema.dimension ?? 0}`,
      );
    }

    this.collections.set(dimensions, collection);

    return collection;
  }

  private toSearchResult(document: ZVecDoc): AgentMemoryIndexSearchResult[] {
    const content = readString(document.fields, CONTENT_FIELD);
    const memoryId = readString(document.fields, MEMORY_ID_FIELD);

    return content && memoryId
      ? [{ content, memoryId, score: document.score }]
      : [];
  }

  private unavailable(error: unknown): ApplicationError {
    const detail = error instanceof Error ? error.message : '未知错误';

    return new ApplicationError(
      'service_unavailable',
      `情景记忆向量索引不可用：${detail}`,
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
}
