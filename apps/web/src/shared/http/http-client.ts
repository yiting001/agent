/** Minimal HTTP boundary shared by infrastructure adapters. */
export interface HttpClient {
  delete(path: string): Promise<void>;
  get(path: string): Promise<unknown>;
  post(path: string, body: unknown): Promise<unknown>;
  put(path: string, body: unknown): Promise<unknown>;
}

/** Browser fetch implementation with consistent HTTP error handling. */
export class FetchHttpClient implements HttpClient {
  constructor(private readonly baseUrl: string) {}

  async delete(path: string): Promise<void> {
    await this.request('DELETE', path);
  }

  async get(path: string): Promise<unknown> {
    const response = await this.request('GET', path);

    return response.json() as Promise<unknown>;
  }

  async post(path: string, body: unknown): Promise<unknown> {
    const response = await this.request('POST', path, body);

    return response.json() as Promise<unknown>;
  }

  async put(path: string, body: unknown): Promise<unknown> {
    const response = await this.request('PUT', path, body);

    return response.json() as Promise<unknown>;
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      method,
    });

    if (!response.ok) {
      throw new Error(`HTTP request failed with status ${response.status}.`);
    }

    return response;
  }
}
