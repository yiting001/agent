import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ManagementPrincipal } from '../../../management-access/domain/management-access';
import {
  AuditManagementAction,
  CurrentManagementPrincipal,
  RequireManagementScopes,
} from '../../../management-access/presentation/http/management-access.decorators';
import { ConvertFeedbackToEvaluationCaseUseCase } from '../../application/convert-feedback-to-evaluation-case.use-case';
import type { FeedbackEvaluationConversionResult } from '../../domain/feedback-review';
import { ConvertFeedbackToEvaluationCaseDto } from './convert-feedback-to-evaluation-case.dto';

@ApiTags('observability')
@Controller('observability/feedback-reviews')
export class ConvertFeedbackToEvaluationCaseController {
  constructor(
    private readonly useCase: ConvertFeedbackToEvaluationCaseUseCase,
  ) {}

  @Post(':feedbackId/evaluation-case')
  @RequireManagementScopes('observability:feedback', 'evaluation:manage')
  @AuditManagementAction({
    action: 'observability.feedback.convert',
    resourceIdParam: 'feedbackId',
    resourceType: 'observability_feedback',
  })
  @ApiOperation({ summary: 'Convert accepted feedback to an Evaluation case' })
  execute(
    @Param('feedbackId') feedbackId: string,
    @Body() body: ConvertFeedbackToEvaluationCaseDto,
    @CurrentManagementPrincipal() principal: ManagementPrincipal,
  ): Promise<FeedbackEvaluationConversionResult> {
    return this.useCase.execute({
      ...body,
      feedbackId,
      subject: principal.subject,
    });
  }
}
