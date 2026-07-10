export type ApiApplicationStatus = 'disabled' | 'ready';

export interface ApiApplication {
  agentId: string;
  createdAt: Date;
  id: string;
  keyHash: string;
  maskedKey: string;
  name: string;
  requestCount: number;
  status: ApiApplicationStatus;
}

export interface ApiApplicationSummary {
  agentId: string;
  createdAt: string;
  endpoint: string;
  id: string;
  maskedKey: string;
  name: string;
  requestCount: number;
  secretKey?: string;
  status: ApiApplicationStatus;
}
