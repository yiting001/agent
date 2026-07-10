import { registerAs } from '@nestjs/config';

const DEFAULT_API_PORT = 3000;
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';
const DEFAULT_DATABASE_PATH = 'agent.sqlite';
const DEFAULT_SERVICE_NAME = 'agent-api';
const DEFAULT_STORAGE_PATH = 'knowledge-storage';
const DEFAULT_QDRANT_URL = 'http://localhost:6333';
const DEFAULT_QDRANT_COLLECTION_PREFIX = 'agent_knowledge';
const DEFAULT_UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_DOCUMENT_BYTES = 128 * 1024 * 1024;
const DEFAULT_INGESTION_POLL_INTERVAL_MS = 2_000;
const DEFAULT_KNOWLEDGE_CHUNK_CHARACTERS = 1_200;
const DEFAULT_KNOWLEDGE_CHUNK_OVERLAP = 180;
const DEFAULT_EMBEDDING_BATCH_SIZE = 24;

/** Runtime values owned by the API process. */
export interface ApplicationConfig {
  corsOrigin: string[];
  credentialEncryptionKey?: string;
  databasePath: string;
  databaseMigrationsRun: boolean;
  databaseSynchronize: boolean;
  embeddingBatchSize: number;
  ingestionPollIntervalMs: number;
  knowledgeChunkCharacters: number;
  knowledgeChunkOverlap: number;
  knowledgeMaxDocumentBytes: number;
  knowledgeStoragePath: string;
  knowledgeUploadChunkBytes: number;
  modelRequestTimeoutMs: number;
  port: number;
  qdrantApiKey?: string;
  qdrantCollectionPrefix: string;
  qdrantUrl: string;
  serviceName: string;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? DEFAULT_API_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('API_PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function parseBoolean(value: string | undefined): boolean {
  return value === 'true';
}

function parsePositiveInteger(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function optionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? DEFAULT_CORS_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Provides validated, typed configuration to Nest modules. */
export const applicationConfig = registerAs(
  'application',
  (): ApplicationConfig => {
    const chunkCharacters = parsePositiveInteger(
      'KNOWLEDGE_CHUNK_CHARACTERS',
      process.env.KNOWLEDGE_CHUNK_CHARACTERS,
      DEFAULT_KNOWLEDGE_CHUNK_CHARACTERS,
    );
    const chunkOverlap = parsePositiveInteger(
      'KNOWLEDGE_CHUNK_OVERLAP',
      process.env.KNOWLEDGE_CHUNK_OVERLAP,
      DEFAULT_KNOWLEDGE_CHUNK_OVERLAP,
    );

    if (chunkOverlap >= chunkCharacters) {
      throw new Error(
        'KNOWLEDGE_CHUNK_OVERLAP must be smaller than KNOWLEDGE_CHUNK_CHARACTERS.',
      );
    }

    return {
      corsOrigin: parseCorsOrigins(process.env.CORS_ORIGIN),
      credentialEncryptionKey: optionalValue(
        process.env.CREDENTIAL_ENCRYPTION_KEY,
      ),
      databasePath: process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
      databaseMigrationsRun: parseBoolean(process.env.DATABASE_MIGRATIONS_RUN),
      databaseSynchronize: parseBoolean(process.env.DATABASE_SYNCHRONIZE),
      embeddingBatchSize: parsePositiveInteger(
        'EMBEDDING_BATCH_SIZE',
        process.env.EMBEDDING_BATCH_SIZE,
        DEFAULT_EMBEDDING_BATCH_SIZE,
      ),
      ingestionPollIntervalMs: parsePositiveInteger(
        'INGESTION_POLL_INTERVAL_MS',
        process.env.INGESTION_POLL_INTERVAL_MS,
        DEFAULT_INGESTION_POLL_INTERVAL_MS,
      ),
      knowledgeChunkCharacters: chunkCharacters,
      knowledgeChunkOverlap: chunkOverlap,
      knowledgeMaxDocumentBytes: parsePositiveInteger(
        'KNOWLEDGE_MAX_DOCUMENT_BYTES',
        process.env.KNOWLEDGE_MAX_DOCUMENT_BYTES,
        DEFAULT_MAX_DOCUMENT_BYTES,
      ),
      knowledgeStoragePath:
        process.env.KNOWLEDGE_STORAGE_PATH ?? DEFAULT_STORAGE_PATH,
      knowledgeUploadChunkBytes: parsePositiveInteger(
        'KNOWLEDGE_UPLOAD_CHUNK_BYTES',
        process.env.KNOWLEDGE_UPLOAD_CHUNK_BYTES,
        DEFAULT_UPLOAD_CHUNK_BYTES,
      ),
      modelRequestTimeoutMs: parsePositiveInteger(
        'MODEL_REQUEST_TIMEOUT_MS',
        process.env.MODEL_REQUEST_TIMEOUT_MS,
        120_000,
      ),
      port: parsePort(process.env.API_PORT),
      qdrantApiKey: optionalValue(process.env.QDRANT_API_KEY),
      qdrantCollectionPrefix:
        process.env.QDRANT_COLLECTION_PREFIX ??
        DEFAULT_QDRANT_COLLECTION_PREFIX,
      qdrantUrl: process.env.QDRANT_URL ?? DEFAULT_QDRANT_URL,
      serviceName: process.env.API_SERVICE_NAME ?? DEFAULT_SERVICE_NAME,
    };
  },
);
