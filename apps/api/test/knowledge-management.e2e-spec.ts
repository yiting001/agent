import type { INestApplication } from '@nestjs/common';
import { promises as fileSystem } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import request from 'supertest';

import {
  createKnowledgeTestApp,
  parseRecord,
  readArray,
  readString,
} from './knowledge-test-app';

describe('Knowledge management', () => {
  const storagePath = resolve('.test-data/knowledge-management');
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await createKnowledgeTestApp(storagePath);
  });

  afterAll(async () => {
    await app.close();
    await fileSystem.rm(storagePath, { force: true, recursive: true });
  });

  it('updates and deletes knowledge bases, modules and documents', async () => {
    const providerResponse = await request(app.getHttpServer())
      .put('/api/model-providers/manage-provider')
      .send({
        apiKey: 'manage-key',
        baseUrl: 'http://model.test/v1',
        chatModel: 'chat-model',
        description: '管理测试模型',
        embeddingModel: 'embedding-model',
        name: '管理测试',
      })
      .expect(200);
    const providerId = readString(parseRecord(providerResponse.text), 'id');

    const baseResponse = await request(app.getHttpServer())
      .post('/api/knowledge-bases')
      .send({
        description: '待管理知识',
        embeddingProviderId: providerId,
        name: '管理知识库',
      })
      .expect(201);
    const knowledgeBase = parseRecord(baseResponse.text);
    const knowledgeBaseId = readString(knowledgeBase, 'id');
    const moduleRecord = readArray(knowledgeBase, 'modules')[0];

    if (
      typeof moduleRecord !== 'object' ||
      moduleRecord === null ||
      Array.isArray(moduleRecord)
    ) {
      throw new Error('Expected a default knowledge module.');
    }

    const moduleId = readString(moduleRecord as Record<string, unknown>, 'id');

    await request(app.getHttpServer())
      .put(`/api/knowledge-bases/${knowledgeBaseId}`)
      .send({ description: '已更新描述', name: '重命名知识库' })
      .expect(200)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'name')).toBe('重命名知识库');
      });

    await request(app.getHttpServer())
      .put(`/api/knowledge-modules/${moduleId}`)
      .send({ description: '已更新模块', name: '重命名模块' })
      .expect(200)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'name')).toBe('重命名模块');
      });

    const document = Buffer.from('可删除文档内容');
    const uploadResponse = await request(app.getHttpServer())
      .post(`/api/knowledge-modules/${moduleId}/uploads`)
      .send({
        fileName: '待删除.txt',
        mimeType: 'text/plain',
        totalBytes: document.length,
      })
      .expect(201);
    const upload = parseRecord(uploadResponse.text);
    const uploadId = readString(upload, 'id');
    const chunkSize = upload.chunkSizeBytes;

    if (typeof chunkSize !== 'number') {
      throw new Error('Expected chunkSizeBytes to be a number.');
    }

    for (
      let partNumber = 1;
      partNumber <= Math.ceil(document.length / chunkSize);
      partNumber += 1
    ) {
      await request(app.getHttpServer())
        .put(`/api/uploads/${uploadId}/parts/${partNumber}`)
        .set('Content-Type', 'application/octet-stream')
        .send(
          document.subarray(
            (partNumber - 1) * chunkSize,
            partNumber * chunkSize,
          ),
        )
        .expect(200);
    }

    const completeResponse = await request(app.getHttpServer())
      .post(`/api/uploads/${uploadId}/complete`)
      .send({})
      .expect(201);
    const documentId = readString(parseRecord(completeResponse.text), 'id');

    const documentsResponse = await request(app.getHttpServer())
      .get(`/api/knowledge-modules/${moduleId}/documents`)
      .expect(200);

    expect(documentsResponse.text).toContain(documentId);
    expect(documentsResponse.text).not.toContain('storageKey');

    await request(app.getHttpServer())
      .delete(`/api/knowledge-documents/${documentId}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/knowledge-modules/${moduleId}/documents`)
      .expect(200)
      .expect(({ text }) => {
        expect(text).not.toContain(documentId);
      });

    const agentResponse = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        description: '占用模块的智能体',
        moduleIds: [moduleId],
        name: '管理测试助手',
        providerId,
        systemPrompt: '测试。',
        temperature: 0.2,
      })
      .expect(201);
    const agentId = readString(parseRecord(agentResponse.text), 'id');

    await request(app.getHttpServer())
      .delete(`/api/knowledge-modules/${moduleId}`)
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/knowledge-bases/${knowledgeBaseId}`)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/agents/${agentId}`)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/knowledge-modules/${moduleId}`)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/knowledge-bases/${knowledgeBaseId}`)
      .expect(204);

    const basesResponse = await request(app.getHttpServer())
      .get('/api/knowledge-bases')
      .expect(200);

    expect(basesResponse.text).not.toContain(knowledgeBaseId);
  });
});
