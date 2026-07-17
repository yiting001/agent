export type ManagementScope =
  | 'evaluation:manage'
  | 'observability:capture'
  | 'observability:content'
  | 'observability:feedback'
  | 'observability:metrics';

export interface ManagementSession {
  scopes: ManagementScope[];
  subject: string;
}
