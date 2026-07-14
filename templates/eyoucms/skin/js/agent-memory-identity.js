(function () {
  'use strict';

  const LEGACY_OWNER_KEY_STORAGE_KEY = 'agent-memory-owner';
  const OWNER_TOKEN_STORAGE_KEY = 'agent-memory-owner-token-v1';

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async function getOwnerToken(request) {
    try {
      window.localStorage.removeItem(LEGACY_OWNER_KEY_STORAGE_KEY);

      const existing = window.localStorage.getItem(OWNER_TOKEN_STORAGE_KEY);

      if (existing) {
        return existing;
      }
    } catch {
      // 无本地存储时仍可使用当前页面生命周期内的 bearer token。
    }

    const response = await request('/memory-owner-tokens', {
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response || typeof response.token !== 'string') {
      throw new Error('记忆主体凭证签发失败。');
    }

    try {
      window.localStorage.setItem(OWNER_TOKEN_STORAGE_KEY, response.token);
    } catch {
      return response.token;
    }

    return response.token;
  }

  window.AgentMemoryIdentity = {
    createConversationId: createId,
    getOwnerToken,
  };
})();
