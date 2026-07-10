import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

import type { ApplicationConfig } from '../../../../config/application.config';
import { ApplicationError } from '../../../../shared/application/application-error';
import type { KnowledgeBase } from '../../domain/knowledge';
import {
  type KnowledgeSearchResult,
  type KnowledgeVectorPoint,
  VectorIndex,
} from '../../application/vector-index';

interface PayloadRecord {
  [key: string]: unknown;
}

function isPayloadRecord(value: unknown): value is PayloadRecord {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class QdrantVectorIndex extends VectorIndex {
  private readonly client: QdrantClient;
  private readonly collectionPrefix: string;

  constructor(configService: ConfigService) {
    super();
    const config = configService.getOrThrow<ApplicationConfig>('application');

    this.client = new QdrantClient({
      apiKey: config.qdrantApiKey,
      checkCompatibility: false,
      url: config.qdrantUrl,
    });
    this.collectionPrefix = config.qdrantCollectionPrefix;
  }

  async ensureCollection(knowledgeBase: KnowledgeBase): Promise<void> {
    try {
      const result = await this.client.collectionExists(
        this.collectionName(knowledgeBase.id),
      );

      if (result.exists) {
        return;
      }

      await this.client.createCollection(
        this.collectionName(knowledgeBase.id),
        {
          on_disk_payload: true,
          vectors: {
            distance: 'Cosine',
            on_disk: true,
            size: knowledgeBase.embeddingDimensions,
          },
        },
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
    try {
      const collection = await this.client.collectionExists(
        this.collectionName(knowledgeBase.id),
      );

      if (!collection.exists) {
        return [];
      }

      const points = await this.client.search(
        this.collectionName(knowledgeBase.id),
        {
          filter: {
            must: [
              {
                key: 'moduleId',
                match: { any: moduleIds },
              },
            ],
          },
          limit,
          vector,
          with_payload: true,
        },
      );

      return points.flatMap((point) => {
        const payload = point.payload;

        if (
          !isPayloadRecord(payload) ||
          typeof payload.content !== 'string' ||
          typeof payload.documentId !== 'string' ||
          typeof payload.fileName !== 'string' ||
          typeof payload.moduleId !== 'string'
        ) {
          return [];
        }

        return [
          {
            content: payload.content,
            documentId: payload.documentId,
            fileName: payload.fileName,
            moduleId: payload.moduleId,
            score: point.score,
          },
        ];
      });
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  async upsert(
    knowledgeBase: KnowledgeBase,
    points: KnowledgeVectorPoint[],
  ): Promise<void> {
    try {
      await this.client.upsert(this.collectionName(knowledgeBase.id), {
        points: points.map((point) => ({
          id: point.id,
          payload: {
            chunkIndex: point.chunkIndex,
            content: point.content,
            documentId: point.documentId,
            fileName: point.fileName,
            moduleId: point.moduleId,
          },
          vector: point.vector,
        })),
        wait: true,
      });
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  private collectionName(knowledgeBaseId: string): string {
    return `${this.collectionPrefix}_${knowledgeBaseId.replaceAll('-', '_')}`;
  }

  private unavailable(error: unknown): ApplicationError {
    const detail = error instanceof Error ? error.message : '未知错误';

    return new ApplicationError(
      'service_unavailable',
      `Qdrant 向量服务不可用：${detail}`,
    );
  }
}
