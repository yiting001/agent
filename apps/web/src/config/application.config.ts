const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

/** Browser runtime values consumed at the application boundary. */
export interface WebApplicationConfig {
  apiBaseUrl: string;
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/** Centralized web configuration prevents environment values in features. */
export const webApplicationConfig: WebApplicationConfig = {
  apiBaseUrl: normalizeBaseUrl(
    import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  ),
};
