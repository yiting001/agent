import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';

import type {
  ObservabilityFeedback,
  ObservabilityGeneration,
  ObservabilityGenerationContent,
  ObservabilityGenerationDetail,
  ObservabilityQualitySummary,
} from '../domain/observability-generation';
import {
  type CompleteObservabilityGenerationInput,
  ObservabilityGenerationRepository,
  type UpdateObservabilityGenerationModelInput,
} from '../application/observability-generation.repository';
import { ObservabilityContentCipher } from '../application/observability-content-cipher';
import {
  encryptContentColumns,
  readPersistedContent,
} from './observability-content-persistence';
import { ObservabilityFeedbackEntity } from './observability-feedback.entity';
import { ObservabilityGenerationContentEntity } from './observability-generation-content.entity';
import { ObservabilityGenerationEntity } from './observability-generation.entity';

function mapGeneration(
  entity: ObservabilityGenerationEntity,
): ObservabilityGeneration {
  return {
    actorKeyHash: entity.actorKeyHash,
    agentId: entity.agentId,
    completedAt: entity.completedAt,
    configuration: entity.configuration,
    conversationId: entity.conversationId,
    finishReasons: entity.finishReasons,
    id: entity.id,
    providerId: entity.providerId,
    providerName: entity.providerName,
    requestedModel: entity.requestedModel,
    responseModel: entity.responseModel,
    source: entity.source,
    startedAt: entity.startedAt,
    status: entity.status,
    traceId: entity.traceId,
    upstreamResponseId: entity.upstreamResponseId,
  };
}

function mapFeedback(
  entity: ObservabilityFeedbackEntity,
): ObservabilityFeedback {
  return {
    actorKeyHash: entity.actorKeyHash,
    comment: entity.comment,
    createdAt: entity.createdAt,
    generationId: entity.generationId,
    id: entity.id,
    metric: entity.metric,
    rating: entity.rating,
    reasonCodes: entity.reasonCodes,
    reviewReason: entity.reviewReason ?? undefined,
    reviewedAt: entity.reviewedAt ?? undefined,
    reviewerSubject: entity.reviewerSubject ?? undefined,
    reviewStatus: entity.reviewStatus ?? undefined,
    source: entity.source,
    convertedAt: entity.convertedAt ?? undefined,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class TypeOrmObservabilityGenerationRepository extends ObservabilityGenerationRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ObservabilityGenerationEntity)
    private readonly generations: Repository<ObservabilityGenerationEntity>,
    @InjectRepository(ObservabilityGenerationContentEntity)
    private readonly contents: Repository<ObservabilityGenerationContentEntity>,
    @InjectRepository(ObservabilityFeedbackEntity)
    private readonly feedback: Repository<ObservabilityFeedbackEntity>,
    private readonly contentCipher: ObservabilityContentCipher,
  ) {
    super();
  }

  async complete(input: CompleteObservabilityGenerationInput): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(ObservabilityGenerationEntity)
        .update(
          { id: input.generationId, status: 'running' },
          {
            completedAt: input.completedAt,
            status: input.status,
          },
        );

      if (!result.affected) {
        return;
      }

      if (!input.output) {
        return;
      }

      const repository = manager.getRepository(
        ObservabilityGenerationContentEntity,
      );
      const content = await repository.findOneBy({
        generationId: input.generationId,
      });

      if (!content) {
        return;
      }

      const payload = readPersistedContent(this.contentCipher, content);

      await repository.save({
        ...content,
        ...encryptContentColumns(this.contentCipher, input.generationId, {
          inputMessages: payload.inputMessages,
          outputText: input.output.text,
        }),
        redactionCount: content.redactionCount + input.output.redactionCount,
        truncated: content.truncated || input.output.truncated,
      });
    });
  }

  async deleteExpiredContents(cutoff: Date): Promise<void> {
    await this.contents.delete({ expiresAt: LessThanOrEqual(cutoff) });
  }

  async findById(id: string): Promise<ObservabilityGeneration | undefined> {
    const entity = await this.generations.findOneBy({ id });

    return entity ? mapGeneration(entity) : undefined;
  }

  async findByTraceId(
    traceId: string,
  ): Promise<ObservabilityGenerationDetail[]> {
    const generations = await this.generations.find({
      order: { startedAt: 'ASC' },
      where: { traceId },
    });
    const generationIds = generations.map((generation) => generation.id);

    if (generationIds.length === 0) {
      return [];
    }

    const [contents, feedback] = await Promise.all([
      this.contents.findBy({ generationId: In(generationIds) }),
      this.feedback.find({
        order: { createdAt: 'ASC' },
        where: { generationId: In(generationIds) },
      }),
    ]);
    const contentByGeneration = new Map(
      contents.map((content) => [content.generationId, content]),
    );

    return generations.map((generation) => {
      const content = contentByGeneration.get(generation.id);
      const payload = content
        ? readPersistedContent(this.contentCipher, content)
        : undefined;

      return {
        agentId: generation.agentId,
        captureMode: content?.captureMode ?? 'off',
        completedAt: generation.completedAt?.toISOString(),
        configuration: generation.configuration,
        conversationId: generation.conversationId,
        feedback: feedback
          .filter((item) => item.generationId === generation.id)
          .map((item) => ({
            comment: item.comment,
            createdAt: item.createdAt.toISOString(),
            id: item.id,
            metric: item.metric,
            rating: item.rating,
            reasonCodes: item.reasonCodes,
            source: item.source,
            updatedAt: item.updatedAt.toISOString(),
          })),
        finishReasons: generation.finishReasons,
        id: generation.id,
        inputMessages: payload?.inputMessages ?? [],
        outputText: payload?.outputText ?? '',
        providerId: generation.providerId,
        providerName: generation.providerName,
        requestedModel: generation.requestedModel,
        responseModel: generation.responseModel,
        source: generation.source,
        startedAt: generation.startedAt.toISOString(),
        status: generation.status,
        traceId: generation.traceId,
        truncated: content?.truncated ?? false,
        upstreamResponseId: generation.upstreamResponseId,
      };
    });
  }

  async getQualitySummary(since: Date): Promise<ObservabilityQualitySummary> {
    const ratings = await this.feedback
      .createQueryBuilder('feedback')
      .innerJoin(
        ObservabilityGenerationEntity,
        'generation',
        'generation.id = feedback.generationId',
      )
      .select('feedback.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('generation.startedAt >= :since', { since })
      .groupBy('feedback.rating')
      .getRawMany<{ count: string; rating: string }>();
    const feedbackCount = ratings.reduce(
      (total, item) => total + Number(item.count),
      0,
    );
    const positiveCount = Number(
      ratings.find((item) => item.rating === 'positive')?.count ?? 0,
    );
    const negativeFeedbackCount = Number(
      ratings.find((item) => item.rating === 'negative')?.count ?? 0,
    );
    const modelMismatchCount = await this.generations
      .createQueryBuilder('generation')
      .where('generation.startedAt >= :since', { since })
      .andWhere('generation.responseModel IS NOT NULL')
      .andWhere('generation.responseModel <> generation.requestedModel')
      .getCount();

    return {
      feedbackCount,
      modelMismatchCount,
      negativeFeedbackCount,
      positiveFeedbackRate:
        feedbackCount === 0
          ? 0
          : Math.round((positiveCount / feedbackCount) * 10_000) / 100,
    };
  }

  async start(
    generation: ObservabilityGeneration,
    content?: ObservabilityGenerationContent,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ObservabilityGenerationEntity).save({
        ...generation,
      });

      if (content) {
        const encrypted = encryptContentColumns(
          this.contentCipher,
          content.generationId,
          {
            inputMessages: content.inputMessages,
            outputText: content.outputText,
          },
        );

        await manager
          .getRepository(ObservabilityGenerationContentEntity)
          .save({ ...content, ...encrypted });
      }
    });
  }

  async updateModel(
    input: UpdateObservabilityGenerationModelInput,
  ): Promise<void> {
    const generation = await this.generations.findOneBy({
      id: input.generationId,
    });

    if (!generation) {
      return;
    }

    await this.generations.save({
      ...generation,
      finishReasons: [
        ...new Set([...generation.finishReasons, ...input.finishReasons]),
      ],
      responseModel: input.responseModel ?? generation.responseModel,
      upstreamResponseId:
        input.upstreamResponseId ?? generation.upstreamResponseId,
    });
  }

  async upsertFeedback(
    feedback: ObservabilityFeedback,
  ): Promise<ObservabilityFeedback> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ObservabilityFeedbackEntity);
      const initialReviewStatus =
        feedback.rating === 'negative' ? 'pending' : null;

      await repository
        .createQueryBuilder()
        .insert()
        .into(ObservabilityFeedbackEntity)
        .values({
          ...feedback,
          convertedAt: null,
          reviewReason: null,
          reviewedAt: null,
          reviewerSubject: null,
          reviewStatus: initialReviewStatus,
        })
        .orIgnore()
        .execute();
      const current = await repository
        .createQueryBuilder('feedback')
        .setLock('pessimistic_write')
        .where('feedback."generationId" = :generationId', {
          generationId: feedback.generationId,
        })
        .andWhere('feedback."actorKeyHash" = :actorKeyHash', {
          actorKeyHash: feedback.actorKeyHash,
        })
        .andWhere('feedback."metric" = :metric', { metric: feedback.metric })
        .getOneOrFail();
      const converted = current.reviewStatus === 'converted';
      const saved = await repository.save({
        ...current,
        comment: feedback.comment,
        convertedAt: converted ? current.convertedAt : null,
        rating: feedback.rating,
        reasonCodes: feedback.reasonCodes,
        reviewReason: converted ? current.reviewReason : null,
        reviewedAt: converted ? current.reviewedAt : null,
        reviewerSubject: converted ? current.reviewerSubject : null,
        reviewStatus: converted ? 'converted' : initialReviewStatus,
        source: feedback.source,
        updatedAt: feedback.updatedAt,
      });

      return mapFeedback(saved);
    });
  }
}
