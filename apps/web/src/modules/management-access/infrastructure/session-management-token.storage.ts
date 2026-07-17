const MANAGEMENT_TOKEN_STORAGE_KEY = 'agent-management-access-token-v1';

export interface ManagementTokenStorage {
  clear(): void;
  has(): boolean;
  read(): string | undefined;
  write(token: string): void;
}

/** Stores the management credential for the current browser tab only. */
export class SessionManagementTokenStorage implements ManagementTokenStorage {
  clear(): void {
    try {
      window.sessionStorage.removeItem(MANAGEMENT_TOKEN_STORAGE_KEY);
    } catch {
      return;
    }
  }

  has(): boolean {
    return Boolean(this.read());
  }

  read(): string | undefined {
    try {
      return (
        window.sessionStorage.getItem(MANAGEMENT_TOKEN_STORAGE_KEY)?.trim() ||
        undefined
      );
    } catch {
      return undefined;
    }
  }

  write(token: string): void {
    const normalized = token.trim();

    if (!normalized) {
      throw new Error('请输入管理凭证。');
    }

    try {
      window.sessionStorage.setItem(MANAGEMENT_TOKEN_STORAGE_KEY, normalized);
    } catch {
      throw new Error('当前浏览器会话无法安全保存管理凭证。');
    }
  }
}
