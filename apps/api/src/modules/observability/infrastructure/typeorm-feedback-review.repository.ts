import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager, In } from 'typeorm';

import { ApplicationError } from '../../../shared/application/application-error';
import { EvaluationCaseEntity } from '../../evaluation/infrastructure/evaluation-case.entity';
import { EvaluationSuiteEntity } from '../../evaluation/infrastructure/evaluation-suite.entity';
import {
  type ConvertFeedbackToEvaluationCaseInput,
  type DecideFeedbackReviewInput,
  FeedbackReviewRepository,
  type ListFeedbackReviewsInput,
} from '../application/feedback-review.repository';
import { ObservabilityContentCipher } from '../application/observability-content-cipher';
import type {
  FeedbackEvaluationConversionResult,
  FeedbackReviewItem,
  FeedbackReviewPage,
} from '../domain/feedback-review';
import { ObservabilityFeedbackEntity } from './observability-feedback.entity';
import { ObservabilityGenerationContentEntity } from './observability-generation-content.entity';
import { ObservabilityGenerationEntity } from './observability-generation.entity';
import { readPersistedContent } from './observability-content-persistence';

@Injectable()
export class TypeOrmFeedbackReviewRepository extends FeedbackReviewRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly contentCipher: ObservabilityContentCipher,
  ) {
    super();
  }

  convertToEvaluationCase(
    input: ConvertFeedbackToEvaluationCaseInput,
  ): Promise<FeedbackEvaluationConversionResult> {
    return this.dataSource.transaction(async (manager) => {
      const feedback = await this.lockFeedback(manager, input.feedbackId);
      const cases = manager.getRepository(EvaluationCaseEntity);
      const existing = await cases.findOneBy({
        sourceFeedbackId: feedback.id,
      });

      if (existing) {
        if (feedback.reviewStatus !== 'converted') {
          throw new ApplicationError(
            'service_unavailable',
            '反馈转换状态与 Evaluation case 来源不一致。',
          );
        }

        return this.conversionResult(feedback.id, existing.id, true);
      }

      if (feedback.reviewStatus !== 'accepted') {
        throw new ApplicationError(
          'conflict',
          '只有已接受的负反馈可以转换为 Evaluation case。',
        );
      }

      const generation = await manager
        .getRepository(ObservabilityGenerationEntity)
        .findOneBy({ id: feedback.generationId });
      const suite = await manager
        .getRepository(EvaluationSuiteEntity)
        .findOneBy({ id: input.suiteId });

      if (!generation) {
        throw new ApplicationError('not_found', '反馈关联的模型回答不存在。');
      }

      if (!suite) {
        throw new ApplicationError('not_found', '目标评估集不存在。');
      }

      if (suite.agentId !== generation.agentId) {
        throw new ApplicationError(
          'invalid_operation',
          '反馈与目标评估集不属于同一智能体。',
        );
      }

      const evaluationCaseId = randomUUID();

      await cases.save({
        evaluationCriteria: input.evaluationCriteria,
        expectedKeywords: input.expectedKeywords,
        expectedOutput: input.expectedOutput,
        id: evaluationCaseId,
        input: input.input,
        source: 'feedback',
        sourceFeedbackId: feedback.id,
        sourceGenerationId: generation.id,
        suiteId: suite.id,
        tags: input.tags,
      });
      const convertedAt = new Date();

      feedback.convertedAt = convertedAt;
      feedback.reviewStatus = 'converted';
      feedback.updatedAt = convertedAt;
      await manager.getRepository(ObservabilityFeedbackEntity).save(feedback);

      return this.conversionResult(feedback.id, evaluationCaseId, false);
    });
  }

  decide(input: DecideFeedbackReviewInput): Promise<FeedbackReviewItem> {
    return this.dataSource.transaction(async (manager) => {
      const feedback = await this.lockFeedback(manager, input.feedbackId);
      const idempotent =
        feedback.reviewStatus === input.decision &&
        feedback.reviewerSubject === input.subject &&
        feedback.reviewReason === input.reason;

      if (!idempotent) {
        if (
          feedback.rating !== 'negative' ||
          feedback.reviewStatus !== 'pending'
        ) {
          throw new ApplicationError(
            'conflict',
            '该反馈已被处置或已退出负反馈审核队列。',
          );
        }

        if (feedback.updatedAt.toISOString() !== input.expectedUpdatedAt) {
          throw new ApplicationError(
            'conflict',
            '反馈内容已更新，请重新加载后再审核。',
          );
        }

        const reviewedAt = new Date();

        feedback.convertedAt = null;
        feedback.reviewReason = input.reason;
        feedback.reviewedAt = reviewedAt;
        feedback.reviewerSubject = input.subject;
        feedback.reviewStatus = input.decision;
        feedback.updatedAt = reviewedAt;
        await manager.getRepository(ObservabilityFeedbackEntity).save(feedback);
      }

      const item = await this.loadReviewItem(manager, feedback);

      return item;
    });
  }

  list(input: ListFeedbackReviewsInput): Promise<FeedbackReviewPage> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ObservabilityFeedbackEntity);
      const [feedback, total] = await repository.findAndCount({
        order: { updatedAt: 'DESC' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        where: { reviewStatus: input.status },
      });
      const items = await this.loadReviewItems(manager, feedback);

      return {
        items,
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize),
      };
    });
  }

  private conversionResult(
    feedbackId: string,
    evaluationCaseId: string,
    alreadyConverted: boolean,
  ): FeedbackEvaluationConversionResult {
    return {
      alreadyConverted,
      evaluationCaseId,
      feedbackId,
      reviewStatus: 'converted',
    };
  }

  private loadReviewItem(
    manager: EntityManager,
    feedback: ObservabilityFeedbackEntity,
  ): Promise<FeedbackReviewItem> {
    return this.loadReviewItems(manager, [feedback]).then((items) => {
      const item = items[0];

      if (!item) {
        throw new ApplicationError('not_found', '负反馈审核记录不存在。');
      }

      return item;
    });
  }

  private async loadReviewItems(
    manager: EntityManager,
    feedback: ObservabilityFeedbackEntity[],
  ): Promise<FeedbackReviewItem[]> {
    if (feedback.length === 0) {
      return [];
    }

    const generationIds = [
      ...new Set(feedback.map((item) => item.generationId)),
    ];
    const [generations, contents] = await Promise.all([
      manager
        .getRepository(ObservabilityGenerationEntity)
        .findBy({ id: In(generationIds) }),
      manager
        .getRepository(ObservabilityGenerationContentEntity)
        .findBy({ generationId: In(generationIds) }),
    ]);
    const generationById = new Map(
      generations.map((generation) => [generation.id, generation]),
    );
    const contentByGenerationId = new Map(
      contents.map((content) => [content.generationId, content]),
    );

    return feedback.map((item) => {
      const generation = generationById.get(item.generationId);

      if (!generation || !item.reviewStatus) {
        throw new ApplicationError('not_found', '负反馈审核记录不存在。');
      }

      const content = contentByGenerationId.get(item.generationId);
      const payload = content
        ? readPersistedContent(this.contentCipher, content)
        : undefined;
      const latestUserMessage = payload?.inputMessages
        .filter((message) => message.role === 'user')
        .at(-1);

      return {
        agentId: generation.agentId,
        comment: item.comment,
        createdAt: item.createdAt.toISOString(),
        expectedOutput: payload?.outputText ?? '',
        feedbackId: item.id,
        generationId: item.generationId,
        input: latestUserMessage?.content ?? '',
        rating: item.rating,
        reasonCodes: item.reasonCodes,
        reviewReason: item.reviewReason ?? undefined,
        reviewedAt: item.reviewedAt?.toISOString(),
        reviewerSubject: item.reviewerSubject ?? undefined,
        reviewStatus: item.reviewStatus,
        truncated: content?.truncated ?? false,
        updatedAt: item.updatedAt.toISOString(),
      };
    });
  }

  private async lockFeedback(
    manager: EntityManager,
    feedbackId: string,
  ): Promise<ObservabilityFeedbackEntity> {
    const feedback = await manager
      .getRepository(ObservabilityFeedbackEntity)
      .createQueryBuilder('feedback')
      .setLock('pessimistic_write')
      .where('feedback.id = :feedbackId', { feedbackId })
      .getOne();

    if (!feedback) {
      throw new ApplicationError('not_found', '负反馈审核记录不存在。');
    }

    return feedback;
  }
}
