const DEFAULT_API_BASE_URL = '/api';
const DEFAULT_CHAT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

/** Browser runtime values consumed at the application boundary. */
export interface WebApplicationConfig {
  apiBaseUrl: string;
  chatAttachmentMaxBytes: number;
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Centralized web configuration prevents environment values in features. */
export const webApplicationConfig: WebApplicationConfig = {
  apiBaseUrl: normalizeBaseUrl(
    import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  ),
  chatAttachmentMaxBytes: positiveInteger(
    import.meta.env.VITE_CHAT_ATTACHMENT_MAX_BYTES,
    DEFAULT_CHAT_ATTACHMENT_MAX_BYTES,
  ),
};
