import type { INestApplication } from '@nestjs/common';
import { promises as fileSystem } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import request from 'supertest';

import { KnowledgeUploadRepository } from '../src/modules/knowledge/application/knowledge-upload.repository';
import type { ChatCompletionInput } from '../src/modules/model-providers/application/model-gateway';
import {
  createKnowledgeTestApp,
  parseRecord,
  readArray,
  readString,
} from './knowledge-test-app';

describe('Knowledge platform', () => {
  const storagePath = resolve('.test-data/knowledge-platform');
  let app: INestApplication<Server>;
  let lastChatInput: ChatCompletionInput | undefined;

  beforeAll(async () => {
    app = await createKnowledgeTestApp(storagePath, (input) => {
      lastChatInput = input;
    });
  });

  afterAll(async () => {
    await app.close();
    await fileSystem.rm(storagePath, { force: true, recursive: true });
  });

  it('persists shared knowledge, agents, credentials and chunked uploads', async () => {
    const providerResponse = await request(app.getHttpServer())
      .put('/api/model-providers/test-provider')
      .send({
        apiKey: 'test-key',
        baseUrl: 'http://model.test/v1',
        chatModel: 'chat-model',
        description: '测试模型服务',
        embeddingModel: 'embedding-model',
        name: '测试模型',
      })
      .expect(200);
    const provider = parseRecord(providerResponse.text);
    const providerId = readString(provider, 'id');

    expect(provider.embeddingDimensions).toBe(3);
    const providersResponse = await request(app.getHttpServer())
      .get('/api/model-providers')
      .expect(200);

    expect(providersResponse.text).not.toContain('test-key');

    const baseResponse = await request(app.getHttpServer())
      .post('/api/knowledge-bases')
      .send({
        description: '企业共享知识',
        embeddingProviderId: providerId,
        name: '企业知识库',
      })
      .expect(201);
    const knowledgeBase = parseRecord(baseResponse.text);
    const knowledgeBaseId = readString(knowledgeBase, 'id');
    const modules = readArray(knowledgeBase, 'modules');
    const defaultModule = modules[0];

    if (
      typeof defaultModule !== 'object' ||
      defaultModule === null ||
      Array.isArray(defaultModule)
    ) {
      throw new Error('Expected a default knowledge module.');
    }

    const defaultModuleId = readString(
      defaultModule as Record<string, unknown>,
      'id',
    );
    const moduleResponse = await request(app.getHttpServer())
      .post(`/api/knowledge-bases/${knowledgeBaseId}/modules`)
      .send({
        description: '多个智能体可共同使用',
        name: '共享政策',
      })
      .expect(201);
    const sharedModuleId = readString(parseRecord(moduleResponse.text), 'id');

    const agentResponse = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        description: '回答企业知识问题',
        moduleIds: [defaultModuleId, sharedModuleId],
        name: '企业助手',
        providerId,
        systemPrompt: '请依据企业知识回答。',
        temperature: 0.2,
      })
      .expect(201);
    const agentId = readString(parseRecord(agentResponse.text), 'id');

    await request(app.getHttpServer())
      .patch(`/api/agents/${agentId}/status`)
      .send({ status: 'published' })
      .expect(200);
    const draftResponse = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        description: '仅供后台调试',
        moduleIds: [],
        name: '草稿智能体',
        providerId,
        systemPrompt: '草稿提示词',
        temperature: 0.2,
      })
      .expect(201);
    const draftAgentId = readString(parseRecord(draftResponse.text), 'id');
    const publicAgents = await request(app.getHttpServer())
      .get('/api/public/agents')
      .expect(200);

    expect(publicAgents.text).toContain(agentId);
    expect(publicAgents.text).not.toContain(draftAgentId);
    const draftChatResponse = await request(app.getHttpServer())
      .post(`/api/public/agents/${draftAgentId}/chat`)
      .send({
        messages: [{ content: '不应公开访问', role: 'user' }],
        stream: false,
      })
      .expect(422);
    expect(draftChatResponse.body).toEqual(
      expect.objectContaining({
        message: '智能体尚未发布，暂时无法公开对话。',
      }),
    );
    await request(app.getHttpServer())
      .post(`/api/agents/${draftAgentId}/chat`)
      .send({
        messages: [{ content: '后台仍可调试', role: 'user' }],
        stream: false,
      })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/agents/${draftAgentId}/status`)
      .send({ status: 'disabled' })
      .expect(200);
    const disabledChatResponse = await request(app.getHttpServer())
      .post(`/api/public/agents/${draftAgentId}/chat`)
      .send({
        messages: [{ content: '停用后不应公开访问', role: 'user' }],
        stream: false,
      })
      .expect(422);
    expect(disabledChatResponse.body).toEqual(
      expect.objectContaining({
        message: '智能体已停用，暂时无法公开对话。',
      }),
    );

    const applicationResponse = await request(app.getHttpServer())
      .post('/api/api-applications')
      .send({ agentId, name: '官网接入' })
      .expect(201);
    const application = parseRecord(applicationResponse.text);
    const secretKey = readString(application, 'secretKey');

    const listedApplications = await request(app.getHttpServer())
      .get('/api/api-applications')
      .expect(200);

    expect(listedApplications.text).not.toContain(secretKey);

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        messages: [{ content: '企业知识是什么？', role: 'user' }],
        stream: false,
      })
      .expect(200)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'answer')).toBe('真实模型回答');
      });

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        messages: [{ content: '流式回答', role: 'user' }],
      })
      .expect('Content-Type', /text\/event-stream/)
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('event: metadata');
        expect(text).toContain('data: {"content":"真实"}');
        expect(text).toContain('event: done');
      });

    const image = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01,
    ]);
    const attachmentResponse = await request(app.getHttpServer())
      .post('/api/chat-attachments')
      .set('Content-Type', 'image/png')
      .set('X-File-Name', encodeURIComponent('截图.png'))
      .send(image)
      .expect(201);
    const imageAttachment = parseRecord(attachmentResponse.text);
    const audio = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    const audioAttachmentResponse = await request(app.getHttpServer())
      .post('/api/chat-attachments')
      .set('Content-Type', 'audio/wav')
      .set('X-File-Name', encodeURIComponent('录音.wav'))
      .send(audio)
      .expect(201);
    const audioAttachment = parseRecord(audioAttachmentResponse.text);
    const attachments = [imageAttachment, audioAttachment];

    await request(app.getHttpServer())
      .post(`/api/agents/${agentId}/chat`)
      .send({
        messages: [
          {
            attachments,
            content: '分析图片和音频',
            role: 'user',
          },
        ],
        stream: false,
      })
      .expect(200);

    const multimodalContent = lastChatInput?.messages.at(-1)?.content;

    expect(Array.isArray(multimodalContent)).toBe(true);
    expect(JSON.stringify(multimodalContent)).toContain(
      'data:image/png;base64,',
    );
    expect(JSON.stringify(multimodalContent)).toContain('"input_audio"');

    await request(app.getHttpServer())
      .post(`/api/public/agents/${agentId}/chat`)
      .send({
        messages: [
          {
            attachments,
            content: '公开多模态测试',
            role: 'user',
          },
        ],
        stream: false,
      })
      .expect(200);

    expect(Array.isArray(lastChatInput?.messages.at(-1)?.content)).toBe(true);
    expect(JSON.stringify(lastChatInput?.messages.at(-1)?.content)).toContain(
      '"input_audio"',
    );

    await request(app.getHttpServer())
      .post('/api/v1/chat/completions')
      .set('Authorization', `Bearer ${secretKey}`)
      .send({
        messages: [
          {
            attachments,
            content: 'API 多模态测试',
            role: 'user',
          },
        ],
        model: 'agent',
        stream: false,
      })
      .expect(200)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'object')).toBe('chat.completion');
      });

    expect(Array.isArray(lastChatInput?.messages.at(-1)?.content)).toBe(true);
    expect(JSON.stringify(lastChatInput?.messages.at(-1)?.content)).toContain(
      'data:image/png;base64,',
    );

    const document = Buffer.from('需要进入异步索引的真实文档内容。');
    const uploadResponse = await request(app.getHttpServer())
      .post(`/api/knowledge-modules/${sharedModuleId}/uploads`)
      .send({
        fileName: '资料.txt',
        mimeType: 'text/plain',
        totalBytes: document.length,
      })
      .expect(201);
    const uploadId = readString(parseRecord(uploadResponse.text), 'id');
    const parts = Array.from(
      { length: Math.ceil(document.length / 8) },
      (_, index) => document.subarray(index * 8, (index + 1) * 8),
    );
    const uploadPart = async (partNumber: number): Promise<void> => {
      const part = parts[partNumber - 1];

      if (!part) {
        throw new Error('Expected upload part.');
      }

      await request(app.getHttpServer())
        .put(`/api/uploads/${uploadId}/parts/${partNumber}`)
        .set('Content-Length', String(part.length))
        .set('Content-Type', 'application/octet-stream')
        .send(part)
        .expect(200);
    };

    await uploadPart(2);
    await uploadPart(1);
    await uploadPart(2);

    for (let partNumber = 3; partNumber <= parts.length; partNumber += 1) {
      await uploadPart(partNumber);
    }

    await request(app.getHttpServer())
      .get(`/api/uploads/${uploadId}`)
      .expect(200)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'status')).toBe('open');
      });

    const completedUpload = await request(app.getHttpServer())
      .post(`/api/uploads/${uploadId}/complete`)
      .send({})
      .expect(201)
      .expect(({ text }) => {
        expect(readString(parseRecord(text), 'status')).toBe('queued');
      });
    const documentId = readString(parseRecord(completedUpload.text), 'id');
    const uploads = app.get(KnowledgeUploadRepository);
    const claimTime = new Date();
    const claims = await Promise.all([
      uploads.claimNextJob({ lockOwner: 'worker-a', now: claimTime }),
      uploads.claimNextJob({ lockOwner: 'worker-b', now: claimTime }),
    ]);
    const claimed = claims.find((job) => job !== undefined);

    expect(claimed).toEqual(
      expect.objectContaining({
        attempts: 1,
        documentId,
        status: 'processing',
      }),
    );
    expect(claims.filter((job) => job !== undefined)).toHaveLength(1);

    if (!claimed) {
      throw new Error('Expected an ingestion job lease.');
    }

    const documentRecord = await uploads.findDocument(documentId);

    if (!documentRecord) {
      throw new Error('Expected the uploaded document.');
    }

    expect(
      await uploads.completeJob(
        { ...claimed, lockOwner: 'stale-worker' },
        { ...documentRecord, status: 'ready' },
      ),
    ).toBe(false);
    expect(
      await uploads.reclaimExpired({
        lockTimeoutMs: 1,
        now: new Date(claimTime.getTime() + 10),
      }),
    ).toBe(1);
    expect((await uploads.findDocument(documentId))?.status).toBe('queued');

    const retried = await uploads.claimNextJob({
      lockOwner: 'worker-c',
      now: new Date(claimTime.getTime() + 11),
    });

    expect(retried?.attempts).toBe(2);

    if (!retried) {
      throw new Error('Expected the reclaimed ingestion job.');
    }

    expect(
      await uploads.failJob({
        dead: false,
        document: documentRecord,
        errorMessage: 'temporary embedding failure',
        job: retried,
        nextRunAt: new Date(claimTime.getTime() + 12),
        now: new Date(claimTime.getTime() + 12),
      }),
    ).toBe(true);
    expect((await uploads.findDocument(documentId))?.status).toBe('queued');

    const finalAttempt = await uploads.claimNextJob({
      lockOwner: 'worker-d',
      now: new Date(claimTime.getTime() + 13),
    });

    expect(finalAttempt?.attempts).toBe(3);

    if (!finalAttempt) {
      throw new Error('Expected the final ingestion attempt.');
    }

    expect(
      await uploads.reclaimExpired({
        lockTimeoutMs: 1,
        now: new Date(claimTime.getTime() + 24),
      }),
    ).toBe(1);
    await request(app.getHttpServer())
      .get(`/api/knowledge-modules/${sharedModuleId}/documents`)
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('"status":"failed"');
      });
  });
});
