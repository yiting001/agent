// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionManagementTokenStorage } from './session-management-token.storage';

describe('SessionManagementTokenStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores a trimmed token only in sessionStorage', () => {
    const storage = new SessionManagementTokenStorage();

    storage.write('  management-secret  ');

    expect(storage.read()).toBe('management-secret');
    expect(storage.has()).toBe(true);
    expect(window.localStorage.length).toBe(0);

    storage.clear();
    expect(storage.read()).toBeUndefined();
  });

  it('fails closed when the browser cannot persist the token', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    const storage = new SessionManagementTokenStorage();

    expect(() => storage.write('management-secret')).toThrow(
      '当前浏览器会话无法安全保存管理凭证。',
    );
  });
});
