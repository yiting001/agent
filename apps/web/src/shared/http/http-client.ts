/** Minimal HTTP boundary shared by infrastructure adapters. */
export interface HttpClient {
  get<Response>(path: string): Promise<Response>;
  patch<Response, Body>(path: string, body: Body): Promise<Response>;
  post<Response, Body>(path: string, body: Body): Promise<Response>;
  put<Response, Body>(path: string, body: Body): Promise<Response>;
  putBlob<Response>(path: string, body: Blob): Promise<Response>;
}

/** Browser fetch implementation with consistent HTTP error handling. */
export class FetchHttpClient implements HttpClient {
  constructor(private readonly baseUrl: string) {}

  get<Response>(path: string): Promise<Response> {
    return this.request<Response>(path, { method: 'GET' });
  }

  patch<Response, Body>(path: string, body: Body): Promise<Response> {
    return this.request<Response>(path, this.jsonRequest('PATCH', body));
  }

  post<Response, Body>(path: string, body: Body): Promise<Response> {
    return this.request<Response>(path, this.jsonRequest('POST', body));
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
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      ...request,
    });

    if (!response.ok) {
      const errorBody: unknown = await response.json().catch(() => undefined);
      const message =
        typeof errorBody === 'object' &&
        errorBody !== null &&
        'message' in errorBody &&
        typeof errorBody.message === 'string'
          ? errorBody.message
          : `后端请求失败，状态码：${response.status}。`;

      throw new Error(message);
    }

    return response.json() as Promise<Response>;
  }
}
