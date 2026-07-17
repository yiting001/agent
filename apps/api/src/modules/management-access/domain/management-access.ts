/** Configuration-backed management permissions available in the P0 boundary. */
export const MANAGEMENT_SCOPES = [
  'observability:metrics',
  'observability:content',
  'observability:feedback',
  'evaluation:manage',
  'observability:capture',
] as const;

export type ManagementScope = (typeof MANAGEMENT_SCOPES)[number];

/** Authenticated configuration subject; it deliberately carries no tenant identity. */
export interface ManagementPrincipal {
  scopes: ManagementScope[];
  subject: string;
}

export type ManagementAuditResult = 'denied' | 'failed' | 'succeeded';

/** Closed metadata shape prevents request bodies, headers, and content from entering audit rows. */
export interface ManagementAuditMetadata {
  method?: string;
  requiredScopes?: ManagementScope[];
  statusCode?: number;
}

export interface ManagementAuditLog {
  action: string;
  createdAt: Date;
  id: string;
  metadata: ManagementAuditMetadata;
  resourceId?: string;
  resourceType: string;
  result: ManagementAuditResult;
  subject: string;
}
