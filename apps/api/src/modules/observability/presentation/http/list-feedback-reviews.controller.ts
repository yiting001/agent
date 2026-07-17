import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ManagementPrincipal } from '../../../management-access/domain/management-access';
import {
  AuditManagementAction,
  CurrentManagementPrincipal,
  RequireManagementScopes,
} from '../../../management-access/presentation/http/management-access.decorators';
import { ListFeedbackReviewsUseCase } from '../../application/list-feedback-reviews.use-case';
import type { FeedbackReviewPage } from '../../domain/feedback-review';
import { ListFeedbackReviewsDto } from './list-feedback-reviews.dto';

@ApiTags('observability')
@Controller('observability/feedback-reviews')
export class ListFeedbackReviewsController {
  constructor(private readonly useCase: ListFeedbackReviewsUseCase) {}

  @Get()
  @RequireManagementScopes('observability:feedback')
  @AuditManagementAction({
    action: 'observability.feedback.queue.view',
    resourceType: 'observability_feedback_queue',
  })
  @ApiOperation({ summary: 'List generation feedback awaiting human review' })
  execute(
    @Query() query: ListFeedbackReviewsDto,
    @CurrentManagementPrincipal() principal: ManagementPrincipal,
  ): Promise<FeedbackReviewPage> {
    return this.useCase.execute({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status ?? 'pending',
      subject: principal.subject,
    });
  }
}
