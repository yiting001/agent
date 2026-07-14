(function () {
  'use strict';

  const OWNER_STORAGE_KEY = 'agent-memory-owner';

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function getOwnerKey() {
    try {
      const existing = window.localStorage.getItem(OWNER_STORAGE_KEY);

      if (existing) {
        return existing;
      }

      const ownerKey = createId();
      window.localStorage.setItem(OWNER_STORAGE_KEY, ownerKey);

      return ownerKey;
    } catch {
      return createId();
    }
  }

  window.AgentMemoryIdentity = {
    createConversationId: createId,
    getOwnerKey,
  };
})();
