import type { Response } from 'express';

import type { StreamingAgentChatResponse } from '../../application/chat-with-agent.use-case';

function writeEvent(response: Response, event: string, data: unknown): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function startStream(response: Response): void {
  response.status(200);
  response.set({
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream; charset=utf-8',
    'X-Accel-Buffering': 'no',
  });
  response.flushHeaders();
}

export async function sendAgentChatStream(
  response: Response,
  chat: StreamingAgentChatResponse,
): Promise<void> {
  startStream(response);
  writeEvent(response, 'metadata', {
    agentId: chat.agentId,
    citations: chat.citations,
    conversationId: chat.conversationId,
    generationId: chat.generationId,
    traceId: chat.traceId,
  });

  try {
    for await (const content of chat.content) {
      writeEvent(response, 'delta', { content });
    }

    writeEvent(response, 'done', {});
  } catch (error) {
    writeEvent(response, 'error', {
      message:
        error instanceof Error ? error.message : '模型流式响应读取失败。',
    });
  } finally {
    response.end();
  }
}

export async function sendOpenAiChatStream(
  response: Response,
  chat: StreamingAgentChatResponse,
  completionId: string,
  model: string,
): Promise<boolean> {
  startStream(response);
  let completed = false;

  try {
    writeEvent(response, 'message', {
      choices: [
        {
          delta: { role: 'assistant' },
          finish_reason: null,
          index: 0,
        },
      ],
      id: completionId,
      model,
      object: 'chat.completion.chunk',
    });

    for await (const content of chat.content) {
      writeEvent(response, 'message', {
        choices: [
          {
            delta: { content },
            finish_reason: null,
            index: 0,
          },
        ],
        id: completionId,
        model,
        object: 'chat.completion.chunk',
      });
    }

    writeEvent(response, 'message', {
      choices: [{ delta: {}, finish_reason: 'stop', index: 0 }],
      id: completionId,
      model,
      object: 'chat.completion.chunk',
    });
    response.write('data: [DONE]\n\n');
    completed = true;
  } catch (error) {
    writeEvent(response, 'error', {
      message:
        error instanceof Error ? error.message : '模型流式响应读取失败。',
    });
  } finally {
    response.end();
  }

  return completed;
}
