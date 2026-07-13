import { registerAs } from '@nestjs/config';

const DEFAULT_API_PORT = 3000;
const DEFAULT_BRAND_ICON_MAX_BYTES = 1024 * 1024;
const DEFAULT_BRAND_STORAGE_PATH = 'brand-storage';
const DEFAULT_CHAT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_CHAT_ATTACHMENT_STORAGE_PATH = 'chat-attachments';
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';
const DEFAULT_DATABASE_PATH = 'agent.sqlite';
const DEFAULT_SOFTWARE_NAME = '灵枢智能体';
const DEFAULT_SERVICE_NAME = 'agent-api';
const DEFAULT_STORAGE_PATH = 'knowledge-storage';
const DEFAULT_ZVEC_DATA_PATH = 'zvec-data';
const DEFAULT_ZVEC_COLLECTION_PREFIX = 'agent_knowledge';
const DEFAULT_ZVEC_UPSERT_BATCH_SIZE = 256;
const DEFAULT_ZVEC_INDEX_TYPE = 'hnsw';
const DEFAULT_UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_DOCUMENT_BYTES = 128 * 1024 * 1024;
const DEFAULT_INGESTION_POLL_INTERVAL_MS = 2_000;
const DEFAULT_KNOWLEDGE_CHUNK_CHARACTERS = 1_200;
const DEFAULT_KNOWLEDGE_CHUNK_OVERLAP = 180;
const DEFAULT_EMBEDDING_BATCH_SIZE = 24;
const DEFAULT_MCP_CLIENT_NAME = 'agent-api';
const DEFAULT_SKILL_TOOL_MAX_ROUNDS = 5;

/** Runtime values owned by the API process. */
export type ZvecIndexType = 'diskann' | 'hnsw';

export interface ApplicationConfig {
  brandIconMaxBytes: number;
  brandStoragePath: string;
  chatAttachmentMaxBytes: number;
  chatAttachmentStoragePath: string;
  corsOrigin: string | string[];
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
  mcpClientName: string;
  modelRequestTimeoutMs: number;
  skillToolMaxRounds: number;
  port: number;
  serviceName: string;
  defaultSoftwareName: string;
  zvecCollectionPrefix: string;
  zvecDataPath: string;
  zvecIndexType: ZvecIndexType;
  zvecUpsertBatchSize: number;
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

function parseZvecIndexType(value: string | undefined): ZvecIndexType {
  const indexType = value ?? DEFAULT_ZVEC_INDEX_TYPE;

  if (indexType !== 'hnsw' && indexType !== 'diskann') {
    throw new Error('ZVEC_INDEX_TYPE must be hnsw or diskann.');
  }

  return indexType;
}

function parseZvecCollectionPrefix(value: string | undefined): string {
  const prefix = value ?? DEFAULT_ZVEC_COLLECTION_PREFIX;

  if (!/^[a-zA-Z0-9_-]+$/.test(prefix)) {
    throw new Error(
      'ZVEC_COLLECTION_PREFIX may only contain letters, numbers, underscores, and hyphens.',
    );
  }

  return prefix;
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
      brandIconMaxBytes: parsePositiveInteger(
        'BRAND_ICON_MAX_BYTES',
        process.env.BRAND_ICON_MAX_BYTES,
        DEFAULT_BRAND_ICON_MAX_BYTES,
      ),
      brandStoragePath:
        process.env.BRAND_STORAGE_PATH ?? DEFAULT_BRAND_STORAGE_PATH,
      chatAttachmentMaxBytes: parsePositiveInteger(
        'CHAT_ATTACHMENT_MAX_BYTES',
        process.env.CHAT_ATTACHMENT_MAX_BYTES,
        DEFAULT_CHAT_ATTACHMENT_MAX_BYTES,
      ),
      chatAttachmentStoragePath:
        process.env.CHAT_ATTACHMENT_STORAGE_PATH ??
        DEFAULT_CHAT_ATTACHMENT_STORAGE_PATH,
      corsOrigin:
        process.env.CORS_ORIGIN?.trim() === '*'
          ? '*'
          : parseCorsOrigins(process.env.CORS_ORIGIN),
      credentialEncryptionKey: optionalValue(
        process.env.CREDENTIAL_ENCRYPTION_KEY,
      ),
      databasePath: process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
      databaseMigrationsRun: parseBoolean(process.env.DATABASE_MIGRATIONS_RUN),
      databaseSynchronize: parseBoolean(process.env.DATABASE_SYNCHRONIZE),
      defaultSoftwareName:
        optionalValue(process.env.DEFAULT_SOFTWARE_NAME) ??
        DEFAULT_SOFTWARE_NAME,
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
      mcpClientName: process.env.MCP_CLIENT_NAME ?? DEFAULT_MCP_CLIENT_NAME,
      modelRequestTimeoutMs: parsePositiveInteger(
        'MODEL_REQUEST_TIMEOUT_MS',
        process.env.MODEL_REQUEST_TIMEOUT_MS,
        120_000,
      ),
      port: parsePort(process.env.API_PORT),
      skillToolMaxRounds: parsePositiveInteger(
        'SKILL_TOOL_MAX_ROUNDS',
        process.env.SKILL_TOOL_MAX_ROUNDS,
        DEFAULT_SKILL_TOOL_MAX_ROUNDS,
      ),
      serviceName: process.env.API_SERVICE_NAME ?? DEFAULT_SERVICE_NAME,
      zvecCollectionPrefix: parseZvecCollectionPrefix(
        process.env.ZVEC_COLLECTION_PREFIX,
      ),
      zvecDataPath: process.env.ZVEC_DATA_PATH ?? DEFAULT_ZVEC_DATA_PATH,
      zvecIndexType: parseZvecIndexType(process.env.ZVEC_INDEX_TYPE),
      zvecUpsertBatchSize: parsePositiveInteger(
        'ZVEC_UPSERT_BATCH_SIZE',
        process.env.ZVEC_UPSERT_BATCH_SIZE,
        DEFAULT_ZVEC_UPSERT_BATCH_SIZE,
      ),
    };
  },
);
