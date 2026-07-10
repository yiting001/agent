export type UploadSessionStatus = 'completed' | 'open';
export type IngestionJobStatus =
  | 'completed'
  | 'failed'
  | 'processing'
  | 'queued';

export interface UploadSession {
  chunkSizeBytes: number;
  createdAt: Date;
  expectedParts: number;
  expiresAt: Date;
  fileName: string;
  id: string;
  mimeType: string;
  moduleId: string;
  receivedBytes: number;
  status: UploadSessionStatus;
  totalBytes: number;
}

export interface UploadPart {
  id: string;
  partNumber: number;
  sha256: string;
  sizeBytes: number;
  storageKey: string;
  uploadSessionId: string;
}

export interface UploadSessionSummary {
  chunkSizeBytes: number;
  expectedParts: number;
  expiresAt: string;
  fileName: string;
  id: string;
  mimeType: string;
  receivedBytes: number;
  status: UploadSessionStatus;
  totalBytes: number;
  uploadedParts: number[];
}

export interface IngestionJob {
  attempts: number;
  completedAt?: Date;
  createdAt: Date;
  documentId: string;
  errorMessage?: string;
  id: string;
  progress: number;
  startedAt?: Date;
  status: IngestionJobStatus;
}
