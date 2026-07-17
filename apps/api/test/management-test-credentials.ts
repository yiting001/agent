export const MANAGEMENT_TEST_TOKENS = {
  content: `mgmt_${'contentAccessTokenValue'.padEnd(43, 'C')}`,
  evaluation: `mgmt_${'evaluationAccessTokenValue'.padEnd(43, 'E')}`,
  feedback: `mgmt_${'feedbackAccessTokenValue'.padEnd(43, 'F')}`,
  full: `mgmt_${'fullManagementAccessTokenValue'.padEnd(43, 'A')}`,
  metrics: `mgmt_${'metricsAccessTokenValue'.padEnd(43, 'M')}`,
} as const;

export const MANAGEMENT_TEST_AUTHORIZATION = `Bearer ${MANAGEMENT_TEST_TOKENS.full}`;

export function managementTestCredentials(): string {
  return JSON.stringify([
    {
      scopes: ['observability:metrics'],
      subject: 'metrics-operator',
      token: MANAGEMENT_TEST_TOKENS.metrics,
    },
    {
      scopes: ['observability:content'],
      subject: 'content-auditor',
      token: MANAGEMENT_TEST_TOKENS.content,
    },
    {
      scopes: ['observability:feedback'],
      subject: 'feedback-reviewer',
      token: MANAGEMENT_TEST_TOKENS.feedback,
    },
    {
      scopes: ['evaluation:manage'],
      subject: 'evaluation-manager',
      token: MANAGEMENT_TEST_TOKENS.evaluation,
    },
    {
      scopes: [
        'observability:metrics',
        'observability:content',
        'observability:feedback',
        'evaluation:manage',
        'observability:capture',
      ],
      subject: 'quality-admin',
      token: MANAGEMENT_TEST_TOKENS.full,
    },
  ]);
}
