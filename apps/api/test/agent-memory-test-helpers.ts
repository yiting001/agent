import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

import { MemoryOwnerIdentity } from '../src/modules/agent-memory/application/memory-owner-identity';
import { readStringProperty } from './read-value';

export async function issueMemoryOwner(
  app: INestApplication<Server>,
): Promise<{ ownerKey: string; ownerToken: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/memory-owner-tokens')
    .send({})
    .expect(201);
  const ownerToken = readStringProperty(response.body, 'token');

  return {
    ownerKey: app.get(MemoryOwnerIdentity).resolve(ownerToken),
    ownerToken,
  };
}

export function readMemoryIdByThread(
  value: unknown,
  sourceThreadId: string,
): string {
  if (!Array.isArray(value)) {
    throw new Error('Expected memories to be an array.');
  }

  const memory = (value as unknown[]).find(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      (item as Record<string, unknown>).sourceThreadId === sourceThreadId,
  );

  return readStringProperty(memory, 'id');
}

export async function waitForMemoryId(
  app: INestApplication<Server>,
  input: { agentId: string; ownerToken: string; sourceThreadId: string },
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const memories = await request(app.getHttpServer())
      .get(`/api/agents/${input.agentId}/memories`)
      .set('X-Memory-Owner-Token', input.ownerToken)
      .expect(200);

    try {
      return readMemoryIdByThread(memories.body, input.sourceThreadId);
    } catch {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
  }

  throw new Error('Expected pending memory to be persisted.');
}

export async function uploadTestImage(
  app: INestApplication<Server>,
  input: { agentId: string; fileName: string; ownerToken: string },
): Promise<Record<string, unknown>> {
  const image = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x03,
  ]);
  const response = await request(app.getHttpServer())
    .post('/api/chat-attachments')
    .set('Content-Type', 'image/png')
    .set('Content-Length', String(image.length))
    .set('X-Agent-Id', input.agentId)
    .set('X-File-Name', encodeURIComponent(input.fileName))
    .set('X-Memory-Owner-Token', input.ownerToken)
    .send(image)
    .expect(201);

  return response.body as Record<string, unknown>;
}
