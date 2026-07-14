import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { promises as fileSystem } from 'node:fs';
import type { Server } from 'node:http';

import { AppModule } from '../src/app.module';
import { DocumentTextExtractor } from '../src/modules/knowledge/application/document-text-extractor';
import { VectorIndex } from '../src/modules/knowledge/application/vector-index';
import { IngestionScheduler } from '../src/modules/knowledge/infrastructure/indexing/ingestion.scheduler';
import type {
  ChatCompletionInput,
  EmbeddingInput,
} from '../src/modules/model-providers/application/model-gateway';
import { ModelGateway } from '../src/modules/model-providers/application/model-gateway';
import { ApplicationErrorFilter } from '../src/shared/presentation/application-error.filter';

export function parseRecord(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Expected an object response.');
  }

  return parsed as Record<string, unknown>;
}

export function readString(
  value: Record<string, unknown>,
  property: string,
): string {
  const result = value[property];

  if (typeof result !== 'string') {
    throw new Error(`Expected ${property} to be a string.`);
  }

  return result;
}

export function readArray(
  value: Record<string, unknown>,
  property: string,
): unknown[] {
  const result = value[property];

  if (!Array.isArray(result)) {
    throw new Error(`Expected ${property} to be an array.`);
  }

  return result;
}

export async function createKnowledgeTestApp(
  storagePath: string,
  onChatInput?: (input: ChatCompletionInput) => void,
): Promise<INestApplication<Server>> {
  process.env.CREDENTIAL_ENCRYPTION_KEY = '22'.repeat(32);
  process.env.CHAT_ATTACHMENT_STORAGE_PATH = `${storagePath}/chat`;
  process.env.DATABASE_MIGRATIONS_RUN = 'false';
  process.env.DATABASE_SYNCHRONIZE = 'true';
  process.env.INGESTION_POLL_INTERVAL_MS = '60000';
  process.env.KNOWLEDGE_STORAGE_PATH = storagePath;
  process.env.KNOWLEDGE_UPLOAD_CHUNK_BYTES = '8';

  await fileSystem.rm(storagePath, { force: true, recursive: true });

  const modelGateway = {
    chat: jest.fn().mockResolvedValue('真实模型回答'),
    embed: jest
      .fn()
      .mockImplementation((input: EmbeddingInput) =>
        Promise.resolve(input.input.map(() => [0.1, 0.2, 0.3])),
      ),
    streamChat: jest.fn().mockImplementation(async function* (
      input: ChatCompletionInput,
    ) {
      await Promise.resolve();
      onChatInput?.(input);
      yield '真实';
      yield '模型回答';
    }),
    verify: jest.fn().mockResolvedValue(undefined),
  };
  const vectorIndex = {
    deleteDocuments: jest.fn().mockResolvedValue(undefined),
    dropCollection: jest.fn().mockResolvedValue(undefined),
    ensureCollection: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([
      {
        content: '企业知识片段',
        documentId: 'document-id',
        fileName: '资料.txt',
        moduleId: 'module-id',
        score: 0.95,
      },
    ]),
    upsert: jest.fn().mockResolvedValue(undefined),
  };
  const textExtractor = {
    extract: jest.fn().mockResolvedValue('企业知识片段'),
  };
  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ModelGateway)
    .useValue(modelGateway)
    .overrideProvider(VectorIndex)
    .useValue(vectorIndex)
    .overrideProvider(DocumentTextExtractor)
    .useValue(textExtractor)
    .overrideProvider(IngestionScheduler)
    .useValue({
      onApplicationBootstrap: () => undefined,
      onApplicationShutdown: () => undefined,
    })
    .compile();

  const app = testingModule.createNestApplication<INestApplication<Server>>();

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApplicationErrorFilter());
  await app.init();

  return app;
}
