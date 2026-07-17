/** Minimal HTTP boundary shared by infrastructure adapters. */
export interface HttpClient {
  delete<Response>(path: string): Promise<Response>;
  get<Response>(path: string): Promise<Response>;
  patch<Response, Body>(path: string, body: Body): Promise<Response>;
  post<Response, Body>(path: string, body: Body): Promise<Response>;
  postFile<Response>(
    path: string,
    body: File,
    headers?: Record<string, string>,
  ): Promise<Response>;
  postEventStream<Body>(
    path: string,
    body: Body,
    onEvent: (event: string, data: string) => void,
  ): Promise<void>;
  put<Response, Body>(path: string, body: Body): Promise<Response>;
  putBlob<Response>(path: string, body: Blob): Promise<Response>;
  putFile<Response>(path: string, body: File): Promise<Response>;
}

export type AuthorizationTokenProvider = () => string | undefined;

/** HTTP failure with a machine-readable status and a token-free message. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Browser fetch implementation with consistent HTTP error handling. */
export class FetchHttpClient implements HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly authorizationTokenProvider?: AuthorizationTokenProvider,
  ) {}

  delete<Response>(path: string): Promise<Response> {
    return this.request<Response>(path, { method: 'DELETE' });
  }

  get<Response>(path: string): Promise<Response> {
    return this.request<Response>(path, { method: 'GET' });
  }

  patch<Response, Body>(path: string, body: Body): Promise<Response> {
    return this.request<Response>(path, this.jsonRequest('PATCH', body));
  }

  post<Response, Body>(path: string, body: Body): Promise<Response> {
    return this.request<Response>(path, this.jsonRequest('POST', body));
  }

  postFile<Response>(
    path: string,
    body: File,
    headers?: Record<string, string>,
  ): Promise<Response> {
    return this.request<Response>(path, {
      body,
      headers: {
        Accept: 'application/json',
        'Content-Type': body.type,
        'X-File-Name': encodeURIComponent(body.name),
        ...headers,
      },
      method: 'POST',
    });
  }

  async postEventStream<Body>(
    path: string,
    body: Body,
    onEvent: (event: string, data: string) => void,
  ): Promise<void> {
    const prepared = this.prepareRequest(this.jsonRequest('POST', body));
    const response = await fetch(`${this.baseUrl}${path}`, prepared.request);

    await this.ensureSuccessful(response, prepared.token);

    if (!response.body) {
      throw new Error('后端未返回可读取的流。');
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);

      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        const lines = block.split(/\r?\n/);
        const event =
          lines
            .find((line) => line.startsWith('event:'))
            ?.slice(6)
            .trim() ?? 'message';
        const data = lines
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');

        if (data) {
          onEvent(event, data);
        }
      }
    }
  }

  put<Response, Body>(path: string, body: Body): Promise<Response> {
    return this.request<Response>(path, this.jsonRequest('PUT', body));
  }

  putBlob<Response>(path: string, body: Blob): Promise<Response> {
    return this.request<Response>(path, {
      body,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/octet-stream',
      },
      method: 'PUT',
    });
  }

  putFile<Response>(path: string, body: File): Promise<Response> {
    return this.request<Response>(path, {
      body,
      headers: {
        Accept: 'application/json',
        'Content-Type': body.type,
      },
      method: 'PUT',
    });
  }

  private jsonRequest(method: string, body: unknown): RequestInit {
    return {
      body: JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method,
    };
  }

  private async request<Response>(
    path: string,
    request: RequestInit,
  ): Promise<Response> {
    const prepared = this.prepareRequest(request);
    const response = await fetch(`${this.baseUrl}${path}`, prepared.request);

    await this.ensureSuccessful(response, prepared.token);

    if (response.status === 204) {
      return undefined as Response;
    }

    return response.json() as Promise<Response>;
  }

  private prepareRequest(request: RequestInit): {
    request: RequestInit;
    token?: string;
  } {
    const headers = new Headers(request.headers);
    const token = this.authorizationTokenProvider?.()?.trim() || undefined;

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return {
      request: {
        ...request,
        headers,
      },
      token,
    };
  }

  private async ensureSuccessful(
    response: Response,
    token?: string,
  ): Promise<void> {
    if (response.ok) {
      return;
    }

    const errorBody: unknown = await response.json().catch(() => undefined);
    const unsafeMessage =
      typeof errorBody === 'object' &&
      errorBody !== null &&
      'message' in errorBody &&
      typeof errorBody.message === 'string'
        ? errorBody.message
        : `后端请求失败，状态码：${response.status}。`;
    const message = token
      ? unsafeMessage.replaceAll(token, '[REDACTED]')
      : unsafeMessage;

    throw new HttpError(message, response.status);
  }
}
