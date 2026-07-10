/** Minimal HTTP boundary shared by infrastructure adapters. */
export interface HttpClient {
  get(path: string): Promise<unknown>;
}

/** Browser fetch implementation with consistent HTTP error handling. */
export class FetchHttpClient implements HttpClient {
  constructor(private readonly baseUrl: string) {}

  async get(path: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`后端请求失败，状态码：${response.status}。`);
    }

    return response.json() as Promise<unknown>;
  }
}
