import { registerAs } from '@nestjs/config';

import {
  optionalValue,
  parseBoolean,
  parseIntegerInRange,
  parseKeyPrefix,
  parseNonNegativeInteger,
  parseNonNegativeNumber,
  parsePositiveInteger,
  parseUrl,
} from './configuration-parsers';

const DEFAULT_API_PORT = 3000;
const DEFAULT_BRAND_ICON_MAX_BYTES = 1024 * 1024;
const DEFAULT_BRAND_STORAGE_PATH = 'brand-storage';
const DEFAULT_CHAT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_CHAT_ATTACHMENT_STORAGE_PATH = 'chat-attachments';
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';
const DEFAULT_DATABASE_POOL_MAX = 20;
const DEFAULT_DATABASE_STATEMENT_TIMEOUT_MS = 30_000;
const DEFAULT_TEST_DATABASE_URL =
  'postgresql://agent:agent@127.0.0.1:5432/agent_test';
const DEFAULT_DATABASE_URL = 'postgresql://agent:agent@127.0.0.1:5432/agent';
const DEFAULT_SOFTWARE_NAME = '灵枢智能体';
const DEFAULT_SERVICE_NAME = 'agent-api';
const DEFAULT_STORAGE_PATH = 'knowledge-storage';
const DEFAULT_VECTOR_HNSW_EF_CONSTRUCTION = 64;
const DEFAULT_VECTOR_HNSW_EF_SEARCH = 40;
const DEFAULT_VECTOR_HNSW_M = 16;
const DEFAULT_VECTOR_UPSERT_BATCH_SIZE = 256;
const DEFAULT_UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_DOCUMENT_BYTES = 128 * 1024 * 1024;
const DEFAULT_PREVIEW_MAX_CHARS = 20_000;
const DEFAULT_INGESTION_POLL_INTERVAL_MS = 2_000;
const DEFAULT_INGESTION_BACKOFF_BASE_MS = 1_000;
const DEFAULT_INGESTION_LOCK_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_INGESTION_MAX_ATTEMPTS = 3;
const DEFAULT_HTTP_TRUST_PROXY_HOPS = 0;
const DEFAULT_KNOWLEDGE_CHUNK_CHARACTERS = 1_200;
const DEFAULT_KNOWLEDGE_CHUNK_OVERLAP = 180;
const DEFAULT_EMBEDDING_BATCH_SIZE = 24;
const DEFAULT_MCP_CLIENT_NAME = 'agent-api';
const DEFAULT_OBSERVABILITY_HIGH_COST_USD = 0.1;
const DEFAULT_OBSERVABILITY_CONTENT_CAPTURE_MODE = 'redacted';
const DEFAULT_OBSERVABILITY_CONTENT_MAX_CHARACTERS = 50_000;
const DEFAULT_OBSERVABILITY_CONTENT_RETENTION_DAYS = 7;
const DEFAULT_OBSERVABILITY_RETENTION_DAYS = 30;
const DEFAULT_OBSERVABILITY_SLOW_MODEL_MS = 30_000;
const DEFAULT_OBSERVABILITY_SLOW_REQUEST_MS = 2_000;
const DEFAULT_SKILL_TOOL_MAX_ROUNDS = 5;
const DEFAULT_AGENT_MEMORY_RECENT_MESSAGE_LIMIT = 12;
const DEFAULT_AGENT_MEMORY_RECALL_LIMIT = 6;
const DEFAULT_AGENT_MEMORY_EPISODE_RECALL_LIMIT = 3;
const DEFAULT_AGENT_MEMORY_EPISODE_MIN_SCORE = 0.25;
const DEFAULT_AGENT_MEMORY_TASK_POLL_INTERVAL_MS = 2_000;
const DEFAULT_AGENT_MEMORY_TASK_MAX_ATTEMPTS = 3;
const DEFAULT_AGENT_MEMORY_TASK_BACKOFF_BASE_MS = 1_000;
const DEFAULT_AGENT_MEMORY_TASK_LOCK_TIMEOUT_MS = 60_000;
const DEFAULT_AGENT_MEMORY_PENDING_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_AGENT_MEMORY_RECONCILE_INTERVAL_MS = 60_000;
const DEFAULT_API_RATE_LIMIT_MAX = 120;
const DEFAULT_PUBLIC_CHAT_RATE_LIMIT_MAX = 30;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_REDIS_KEY_PREFIX = 'agent';

/** API 进程唯一使用的已校验运行时配置。 */
export interface ApplicationConfig {
  /** 情景记忆召回的最低综合分。 */
  agentMemoryEpisodeMinScore: number;
  agentMemoryEpisodeRecallLimit: number;
  /** pending 记忆超过该时长后进入一致性修复范围。 */
  agentMemoryPendingTimeoutMs: number;
  agentMemoryRecallLimit: number;
  /** 后台一致性巡检间隔。 */
  agentMemoryReconcileIntervalMs: number;
  agentMemoryRecentMessageLimit: number;
  /** 任务失败后的指数退避基准时长。 */
  agentMemoryTaskBackoffBaseMs: number;
  /** processing 租约超过该时长后允许回收。 */
  agentMemoryTaskLockTimeoutMs: number;
  /** 超过最大尝试次数后任务进入 dead。 */
  agentMemoryTaskMaxAttempts: number;
  agentMemoryTaskPollIntervalMs: number;
  /** 正式 API 应用在单个窗口内的请求上限。 */
  apiRateLimitMax: number;
  brandIconMaxBytes: number;
  brandStoragePath: string;
  chatAttachmentMaxBytes: number;
  chatAttachmentStoragePath: string;
  /** CORS 允许来源；生产环境不应使用通配符。 */
  corsOrigin: string | string[];
  /** AES-256-GCM 根密钥；生产环境必须由密钥系统注入。 */
  credentialEncryptionKey?: string;
  /** 仅测试环境允许删除 schema。 */
  databaseDropSchema: boolean;
  /** 启动时是否执行显式 migration。 */
  databaseMigrationsRun: boolean;
  databasePoolMax: number;
  databaseStatementTimeoutMs: number;
  /** 生产环境必须为 false，禁止用 synchronize 替代 migration。 */
  databaseSynchronize: boolean;
  /** PostgreSQL 连接地址，禁止写入日志或响应。 */
  databaseUrl: string;
  embeddingBatchSize: number;
  /** Express 信任的反向代理跳数，影响 request.ip 和限流身份。 */
  httpTrustProxyHops: number;
  /** 摄取失败后的指数退避基准时长。 */
  ingestionBackoffBaseMs: number;
  /** processing 摄取任务超过该时长后允许回收。 */
  ingestionLockTimeoutMs: number;
  /** 摄取任务超过最大领取次数后进入 failed。 */
  ingestionMaxAttempts: number;
  ingestionPollIntervalMs: number;
  knowledgeChunkCharacters: number;
  /** 相邻切片重叠字符数，启动时强制小于切片长度。 */
  knowledgeChunkOverlap: number;
  /** 单个知识文档允许的最大字节数。 */
  knowledgeMaxDocumentBytes: number;
  knowledgePreviewMaxChars: number;
  knowledgeStoragePath: string;
  knowledgeUploadChunkBytes: number;
  mcpClientName: string;
  /** 模型 HTTP 请求超时时间。 */
  modelRequestTimeoutMs: number;
  observabilityContentCaptureMode: 'off' | 'redacted';
  observabilityContentMaxCharacters: number;
  observabilityContentRetentionDays: number;
  observabilityHighCostUsd: number;
  observabilityRetentionDays: number;
  observabilitySlowModelMs: number;
  observabilitySlowRequestMs: number;
  /** 公开聊天按 agentId + IP 的窗口请求上限。 */
  publicChatRateLimitMax: number;
  /** API 应用与公开聊天共用的限流窗口。 */
  rateLimitWindowMs: number;
  /** Redis 键命名空间，防止多服务部署时互相覆盖。 */
  redisKeyPrefix: string;
  /** Redis 未配置时仅开发环境允许使用进程内降级。 */
  redisUrl?: string;
  /** 单轮聊天允许执行的最大 MCP 工具轮数。 */
  skillToolMaxRounds: number;
  port: number;
  serviceName: string;
  defaultSoftwareName: string;
  /** HNSW 建索引质量参数，越高构建越慢但召回通常更好。 */
  vectorHnswEfConstruction: number;
  /** HNSW 查询候选数，越高查询越慢但召回通常更好。 */
  vectorHnswEfSearch: number;
  /** HNSW 每个节点的最大连接数。 */
  vectorHnswM: number;
  /** 单次向量 upsert 的最大记录数。 */
  vectorUpsertBatchSize: number;
}

/** 校验 API 监听端口。 */
function parsePort(value: string | undefined): number {
  const port = Number(value ?? DEFAULT_API_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('API_PORT must be an integer between 1 and 65535.');
  }

  return port;
}

/** 将逗号分隔的来源列表规范化为非空字符串数组。 */
function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? DEFAULT_CORS_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseObservabilityCaptureMode(
  value: string | undefined,
): 'off' | 'redacted' {
  const mode = value ?? DEFAULT_OBSERVABILITY_CONTENT_CAPTURE_MODE;

  if (mode !== 'off' && mode !== 'redacted') {
    throw new Error(
      'OBSERVABILITY_CONTENT_CAPTURE_MODE must be off or redacted.',
    );
  }

  return mode;
}

/** 从环境变量构造经过范围和生产安全约束校验的 Nest 配置。 */
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

    const databaseUrl =
      process.env.NODE_ENV === 'test'
        ? parseUrl(
            'TEST_DATABASE_URL',
            process.env.TEST_DATABASE_URL,
            DEFAULT_TEST_DATABASE_URL,
            ['postgres:', 'postgresql:'],
          )
        : parseUrl(
            'DATABASE_URL',
            process.env.DATABASE_URL,
            process.env.NODE_ENV === 'production'
              ? undefined
              : DEFAULT_DATABASE_URL,
            ['postgres:', 'postgresql:'],
          );

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required.');
    }

    const databaseSynchronize = parseBoolean(process.env.DATABASE_SYNCHRONIZE);
    const redisUrl = parseUrl('REDIS_URL', process.env.REDIS_URL, undefined, [
      'redis:',
      'rediss:',
    ]);

    if (process.env.NODE_ENV === 'production' && databaseSynchronize) {
      throw new Error('DATABASE_SYNCHRONIZE must be false in production.');
    }

    if (process.env.NODE_ENV === 'production' && !redisUrl) {
      throw new Error('REDIS_URL is required in production.');
    }

    return {
      apiRateLimitMax: parsePositiveInteger(
        'API_RATE_LIMIT_MAX',
        process.env.API_RATE_LIMIT_MAX,
        DEFAULT_API_RATE_LIMIT_MAX,
      ),
      agentMemoryEpisodeMinScore: parseNonNegativeNumber(
        'AGENT_MEMORY_EPISODE_MIN_SCORE',
        process.env.AGENT_MEMORY_EPISODE_MIN_SCORE,
        DEFAULT_AGENT_MEMORY_EPISODE_MIN_SCORE,
      ),
      agentMemoryEpisodeRecallLimit: parsePositiveInteger(
        'AGENT_MEMORY_EPISODE_RECALL_LIMIT',
        process.env.AGENT_MEMORY_EPISODE_RECALL_LIMIT,
        DEFAULT_AGENT_MEMORY_EPISODE_RECALL_LIMIT,
      ),
      agentMemoryPendingTimeoutMs: parsePositiveInteger(
        'AGENT_MEMORY_PENDING_TIMEOUT_MS',
        process.env.AGENT_MEMORY_PENDING_TIMEOUT_MS,
        DEFAULT_AGENT_MEMORY_PENDING_TIMEOUT_MS,
      ),
      agentMemoryRecallLimit: parsePositiveInteger(
        'AGENT_MEMORY_RECALL_LIMIT',
        process.env.AGENT_MEMORY_RECALL_LIMIT,
        DEFAULT_AGENT_MEMORY_RECALL_LIMIT,
      ),
      agentMemoryReconcileIntervalMs: parsePositiveInteger(
        'AGENT_MEMORY_RECONCILE_INTERVAL_MS',
        process.env.AGENT_MEMORY_RECONCILE_INTERVAL_MS,
        DEFAULT_AGENT_MEMORY_RECONCILE_INTERVAL_MS,
      ),
      agentMemoryRecentMessageLimit: parsePositiveInteger(
        'AGENT_MEMORY_RECENT_MESSAGE_LIMIT',
        process.env.AGENT_MEMORY_RECENT_MESSAGE_LIMIT,
        DEFAULT_AGENT_MEMORY_RECENT_MESSAGE_LIMIT,
      ),
      agentMemoryTaskBackoffBaseMs: parsePositiveInteger(
        'AGENT_MEMORY_TASK_BACKOFF_BASE_MS',
        process.env.AGENT_MEMORY_TASK_BACKOFF_BASE_MS,
        DEFAULT_AGENT_MEMORY_TASK_BACKOFF_BASE_MS,
      ),
      agentMemoryTaskLockTimeoutMs: parsePositiveInteger(
        'AGENT_MEMORY_TASK_LOCK_TIMEOUT_MS',
        process.env.AGENT_MEMORY_TASK_LOCK_TIMEOUT_MS,
        DEFAULT_AGENT_MEMORY_TASK_LOCK_TIMEOUT_MS,
      ),
      agentMemoryTaskMaxAttempts: parsePositiveInteger(
        'AGENT_MEMORY_TASK_MAX_ATTEMPTS',
        process.env.AGENT_MEMORY_TASK_MAX_ATTEMPTS,
        DEFAULT_AGENT_MEMORY_TASK_MAX_ATTEMPTS,
      ),
      agentMemoryTaskPollIntervalMs: parsePositiveInteger(
        'AGENT_MEMORY_TASK_POLL_INTERVAL_MS',
        process.env.AGENT_MEMORY_TASK_POLL_INTERVAL_MS,
        DEFAULT_AGENT_MEMORY_TASK_POLL_INTERVAL_MS,
      ),
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
      databaseDropSchema: process.env.NODE_ENV === 'test',
      databaseMigrationsRun: parseBoolean(process.env.DATABASE_MIGRATIONS_RUN),
      databasePoolMax: parsePositiveInteger(
        'DATABASE_POOL_MAX',
        process.env.DATABASE_POOL_MAX,
        DEFAULT_DATABASE_POOL_MAX,
      ),
      databaseStatementTimeoutMs: parsePositiveInteger(
        'DATABASE_STATEMENT_TIMEOUT_MS',
        process.env.DATABASE_STATEMENT_TIMEOUT_MS,
        DEFAULT_DATABASE_STATEMENT_TIMEOUT_MS,
      ),
      databaseSynchronize,
      databaseUrl,
      defaultSoftwareName:
        optionalValue(process.env.DEFAULT_SOFTWARE_NAME) ??
        DEFAULT_SOFTWARE_NAME,
      embeddingBatchSize: parsePositiveInteger(
        'EMBEDDING_BATCH_SIZE',
        process.env.EMBEDDING_BATCH_SIZE,
        DEFAULT_EMBEDDING_BATCH_SIZE,
      ),
      httpTrustProxyHops: parseNonNegativeInteger(
        'HTTP_TRUST_PROXY_HOPS',
        process.env.HTTP_TRUST_PROXY_HOPS,
        DEFAULT_HTTP_TRUST_PROXY_HOPS,
      ),
      ingestionBackoffBaseMs: parsePositiveInteger(
        'INGESTION_BACKOFF_BASE_MS',
        process.env.INGESTION_BACKOFF_BASE_MS,
        DEFAULT_INGESTION_BACKOFF_BASE_MS,
      ),
      ingestionLockTimeoutMs: parsePositiveInteger(
        'INGESTION_LOCK_TIMEOUT_MS',
        process.env.INGESTION_LOCK_TIMEOUT_MS,
        DEFAULT_INGESTION_LOCK_TIMEOUT_MS,
      ),
      ingestionMaxAttempts: parsePositiveInteger(
        'INGESTION_MAX_ATTEMPTS',
        process.env.INGESTION_MAX_ATTEMPTS,
        DEFAULT_INGESTION_MAX_ATTEMPTS,
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
      knowledgePreviewMaxChars: parsePositiveInteger(
        'KNOWLEDGE_PREVIEW_MAX_CHARS',
        process.env.KNOWLEDGE_PREVIEW_MAX_CHARS,
        DEFAULT_PREVIEW_MAX_CHARS,
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
      observabilityContentCaptureMode: parseObservabilityCaptureMode(
        process.env.OBSERVABILITY_CONTENT_CAPTURE_MODE,
      ),
      observabilityContentMaxCharacters: parsePositiveInteger(
        'OBSERVABILITY_CONTENT_MAX_CHARACTERS',
        process.env.OBSERVABILITY_CONTENT_MAX_CHARACTERS,
        DEFAULT_OBSERVABILITY_CONTENT_MAX_CHARACTERS,
      ),
      observabilityContentRetentionDays: parsePositiveInteger(
        'OBSERVABILITY_CONTENT_RETENTION_DAYS',
        process.env.OBSERVABILITY_CONTENT_RETENTION_DAYS,
        DEFAULT_OBSERVABILITY_CONTENT_RETENTION_DAYS,
      ),
      observabilityHighCostUsd: parseNonNegativeNumber(
        'OBSERVABILITY_HIGH_COST_USD',
        process.env.OBSERVABILITY_HIGH_COST_USD,
        DEFAULT_OBSERVABILITY_HIGH_COST_USD,
      ),
      observabilityRetentionDays: parsePositiveInteger(
        'OBSERVABILITY_RETENTION_DAYS',
        process.env.OBSERVABILITY_RETENTION_DAYS,
        DEFAULT_OBSERVABILITY_RETENTION_DAYS,
      ),
      observabilitySlowModelMs: parsePositiveInteger(
        'OBSERVABILITY_SLOW_MODEL_MS',
        process.env.OBSERVABILITY_SLOW_MODEL_MS,
        DEFAULT_OBSERVABILITY_SLOW_MODEL_MS,
      ),
      observabilitySlowRequestMs: parsePositiveInteger(
        'OBSERVABILITY_SLOW_REQUEST_MS',
        process.env.OBSERVABILITY_SLOW_REQUEST_MS,
        DEFAULT_OBSERVABILITY_SLOW_REQUEST_MS,
      ),
      port: parsePort(process.env.API_PORT),
      publicChatRateLimitMax: parsePositiveInteger(
        'PUBLIC_CHAT_RATE_LIMIT_MAX',
        process.env.PUBLIC_CHAT_RATE_LIMIT_MAX,
        DEFAULT_PUBLIC_CHAT_RATE_LIMIT_MAX,
      ),
      rateLimitWindowMs: parsePositiveInteger(
        'RATE_LIMIT_WINDOW_MS',
        process.env.RATE_LIMIT_WINDOW_MS,
        DEFAULT_RATE_LIMIT_WINDOW_MS,
      ),
      redisKeyPrefix: parseKeyPrefix(
        'REDIS_KEY_PREFIX',
        process.env.REDIS_KEY_PREFIX,
        DEFAULT_REDIS_KEY_PREFIX,
      ),
      redisUrl,
      skillToolMaxRounds: parsePositiveInteger(
        'SKILL_TOOL_MAX_ROUNDS',
        process.env.SKILL_TOOL_MAX_ROUNDS,
        DEFAULT_SKILL_TOOL_MAX_ROUNDS,
      ),
      serviceName: process.env.API_SERVICE_NAME ?? DEFAULT_SERVICE_NAME,
      vectorHnswEfConstruction: parseIntegerInRange(
        'VECTOR_HNSW_EF_CONSTRUCTION',
        process.env.VECTOR_HNSW_EF_CONSTRUCTION,
        DEFAULT_VECTOR_HNSW_EF_CONSTRUCTION,
        4,
        1_000,
      ),
      vectorHnswEfSearch: parseIntegerInRange(
        'VECTOR_HNSW_EF_SEARCH',
        process.env.VECTOR_HNSW_EF_SEARCH,
        DEFAULT_VECTOR_HNSW_EF_SEARCH,
        1,
        1_000,
      ),
      vectorHnswM: parseIntegerInRange(
        'VECTOR_HNSW_M',
        process.env.VECTOR_HNSW_M,
        DEFAULT_VECTOR_HNSW_M,
        2,
        100,
      ),
      vectorUpsertBatchSize: parseIntegerInRange(
        'VECTOR_UPSERT_BATCH_SIZE',
        process.env.VECTOR_UPSERT_BATCH_SIZE,
        DEFAULT_VECTOR_UPSERT_BATCH_SIZE,
        1,
        1_000,
      ),
    };
  },
);
