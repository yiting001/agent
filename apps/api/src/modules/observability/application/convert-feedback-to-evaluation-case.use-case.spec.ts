import { ConvertFeedbackToEvaluationCaseUseCase } from './convert-feedback-to-evaluation-case.use-case';
import { FeedbackReviewRepository } from './feedback-review.repository';

describe('ConvertFeedbackToEvaluationCaseUseCase', () => {
  it('redacts a pasted management credential from every editable case field', async () => {
    const convertToEvaluationCase = jest.fn().mockResolvedValue({
      alreadyConverted: false,
      evaluationCaseId: 'case-id',
      feedbackId: 'feedback-id',
      reviewStatus: 'converted',
    });
    const repository = {
      convertToEvaluationCase,
    } as unknown as FeedbackReviewRepository;
    const useCase = new ConvertFeedbackToEvaluationCaseUseCase(repository);
    const token = `mgmt_${'A'.repeat(43)}`;

    await useCase.execute({
      evaluationCriteria: `不得包含 ${token}`,
      expectedKeywords: [token],
      expectedOutput: `答案 ${token}`,
      feedbackId: 'feedback-id',
      input: `问题 ${token}`,
      subject: 'reviewer',
      suiteId: 'suite-id',
      tags: [token],
    });

    expect(convertToEvaluationCase).toHaveBeenCalledWith({
      evaluationCriteria: '不得包含 [已脱敏]',
      expectedKeywords: ['[已脱敏]'],
      expectedOutput: '答案 [已脱敏]',
      feedbackId: 'feedback-id',
      input: '问题 [已脱敏]',
      subject: 'reviewer',
      suiteId: 'suite-id',
      tags: ['[已脱敏]'],
    });
    expect(JSON.stringify(convertToEvaluationCase.mock.calls)).not.toContain(
      token,
    );
  });
});
