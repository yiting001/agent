(function () {
  'use strict';

  async function stream(url, body, onDelta) {
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.json().catch(() => undefined);

      throw new Error(
        errorBody && typeof errorBody.message === 'string'
          ? errorBody.message
          : `服务请求失败（${response.status}）`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const metadata = {};
    let buffer = '';

    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      buffer += decoder.decode(result.value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);

      buffer = blocks.pop() || '';

      for (const block of blocks) {
        const eventLine = block
          .split(/\r?\n/)
          .find((line) => line.startsWith('event:'));
        const event = eventLine ? eventLine.slice(6).trim() : 'message';
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');

        if (!data) {
          continue;
        }

        const payload = JSON.parse(data);

        if (event === 'metadata') {
          if (typeof payload.generationId === 'string') {
            metadata.generationId = payload.generationId;
          }
          if (typeof payload.traceId === 'string') {
            metadata.traceId = payload.traceId;
          }
        }

        if (event === 'delta' && typeof payload.content === 'string') {
          onDelta(payload.content);
        }

        if (event === 'error') {
          throw new Error(payload.message || '模型流式响应读取失败。');
        }
      }
    }

    return metadata;
  }

  window.AgentSse = { stream };
})();
