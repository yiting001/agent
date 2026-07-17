import { Body, Controller, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ManagementPrincipal } from '../../../management-access/domain/management-access';
import {
  AuditManagementAction,
  CurrentManagementPrincipal,
  RequireManagementScopes,
} from '../../../management-access/presentation/http/management-access.decorators';
import { DecideFeedbackReviewUseCase } from '../../application/decide-feedback-review.use-case';
import type { FeedbackReviewItem } from '../../domain/feedback-review';
import { DecideFeedbackReviewDto } from './decide-feedback-review.dto';

@ApiTags('observability')
@Controller('observability/feedback-reviews')
export class DecideFeedbackReviewController {
  constructor(private readonly useCase: DecideFeedbackReviewUseCase) {}

  @Put(':feedbackId')
  @RequireManagementScopes('observability:feedback')
  @AuditManagementAction({
    action: 'observability.feedback.review',
    resourceIdParam: 'feedbackId',
    resourceType: 'observability_feedback',
  })
  @ApiOperation({ summary: 'Accept or reject one negative feedback review' })
  execute(
    @Param('feedbackId') feedbackId: string,
    @Body() body: DecideFeedbackReviewDto,
    @CurrentManagementPrincipal() principal: ManagementPrincipal,
  ): Promise<FeedbackReviewItem> {
    return this.useCase.execute({
      ...body,
      feedbackId,
      subject: principal.subject,
    });
  }
}
