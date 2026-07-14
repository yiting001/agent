/** 每个智能体在浏览器本地最多保留的历史会话数量。 */
const AGENT_CONVERSATION_LIMIT = 30;

/**
 * 对话历史存储与侧栏会话列表控制器。
 * 会话数据保存在浏览器 localStorage，按智能体隔离，
 * 切换/删除/新建会话均在此模块内完成，页面主脚本只需响应回调。
 */
(function () {
  'use strict';

  const STORAGE_PREFIX = 'agent-chat-conversations:';

  function storageKey(agentId) {
    return `${STORAGE_PREFIX}${agentId}`;
  }

  function readAll(agentId) {
    try {
      const raw = window.localStorage.getItem(storageKey(agentId));
      const parsed = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeAll(agentId, conversations) {
    try {
      window.localStorage.setItem(
        storageKey(agentId),
        JSON.stringify(conversations.slice(0, AGENT_CONVERSATION_LIMIT)),
      );
    } catch {
      /* 存储不可用（隐私模式等）时静默降级为不持久化。 */
    }
  }

  function createId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);

    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(
      date.getHours(),
    ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function conversationTitle(messages) {
    const firstUserMessage = messages.find(
      (message) => message.role === 'user' && message.content,
    );
    const title = firstUserMessage ? firstUserMessage.content.trim() : '';

    return title ? title.slice(0, 18) : '新对话';
  }

  function create(options) {
    const { agentId, nav, onSelect } = options;
    let conversations = readAll(agentId);
    let activeId = '';

    function iconMarkup() {
      return [
        '<span class="chat-history__icon"><svg aria-hidden="true">',
        '<use href="#chat-icon-message" xlink:href="#chat-icon-message"></use>',
        '</svg></span>',
      ].join('');
    }

    function renderItem(conversation) {
      const item = document.createElement('div');
      const button = document.createElement('button');
      const copy = document.createElement('span');
      const title = document.createElement('strong');
      const time = document.createElement('span');
      const remove = document.createElement('button');

      item.className = `chat-history__item ${
        conversation.id === activeId ? 'is-active' : ''
      }`.trim();
      button.type = 'button';
      button.className = 'chat-history__main';
      button.innerHTML = iconMarkup();
      copy.className = 'chat-history__copy';
      title.textContent = conversation.title;
      time.textContent = formatTime(conversation.updatedAt);
      copy.append(title, time);
      button.appendChild(copy);
      button.addEventListener('click', () => {
        activeId = conversation.id;
        render();
        onSelect(conversation);
      });
      remove.type = 'button';
      remove.className = 'chat-history__remove';
      remove.setAttribute('aria-label', '删除该会话');
      remove.title = '删除该会话';
      remove.innerHTML =
        '<svg aria-hidden="true"><use href="#chat-icon-trash" xlink:href="#chat-icon-trash"></use></svg>';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();

        if (!window.confirm('确定删除这条会话记录吗？')) {
          return;
        }

        conversations = conversations.filter(
          (candidate) => candidate.id !== conversation.id,
        );
        writeAll(agentId, conversations);

        if (activeId === conversation.id) {
          activeId = '';
          render();
          onSelect(undefined);
          return;
        }

        render();
      });
      item.append(button, remove);
      return item;
    }

    function render() {
      if (!nav) {
        return;
      }

      nav.replaceChildren();

      if (!conversations.length) {
        const empty = document.createElement('p');

        empty.className = 'chat-history__empty';
        empty.textContent = '暂无历史会话';
        nav.appendChild(empty);
        return;
      }

      conversations.forEach((conversation) =>
        nav.appendChild(renderItem(conversation)),
      );
    }

    render();

    return {
      /** 保存当前消息记录；没有活动会话时自动创建一条。 */
      save(messages, conversationId) {
        if (!messages.length) {
          return;
        }

        const snapshot = messages.map((message) => ({ ...message }));
        activeId = activeId || conversationId || '';
        const existing = conversations.find(
          (conversation) => conversation.id === activeId,
        );

        if (existing) {
          existing.messages = snapshot;
          existing.title = conversationTitle(snapshot);
          existing.updatedAt = Date.now();
        } else {
          activeId = conversationId || createId();
          conversations.unshift({
            id: activeId,
            messages: snapshot,
            title: conversationTitle(snapshot),
            updatedAt: Date.now(),
          });
        }

        conversations.sort((left, right) => right.updatedAt - left.updatedAt);
        writeAll(agentId, conversations);
        render();
      },
      /** 开始新会话：仅取消活动态，历史保留在列表中。 */
      startNew() {
        activeId = '';
        render();
      },
    };
  }

  window.AgentConversations = { create };
})();
