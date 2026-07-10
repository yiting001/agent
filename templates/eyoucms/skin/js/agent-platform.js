(function () {
  'use strict';

  const conversation = document.querySelector('[data-chat-conversation]');
  const input = document.querySelector('[data-chat-input]');
  const sendButton = document.querySelector('[data-chat-send]');
  const clearButtons = document.querySelectorAll('[data-chat-clear]');
  const sidebar = document.querySelector('[data-chat-sidebar]');
  const sidebarBackdrop = document.querySelector('[data-chat-backdrop]');
  const sidebarOpenButton = document.querySelector('[data-chat-sidebar-open]');
  const historyItems = document.querySelectorAll('[data-chat-history]');
  const brandRoots = document.querySelectorAll('[data-brand-root]');
  const brandNames = document.querySelectorAll('[data-brand-name]');
  const brandIcons = document.querySelectorAll('[data-brand-icon]');
  const query = new URLSearchParams(window.location.search);
  const configuredApiBase = document.body.dataset.apiBase || '/api';
  const configuredAgentId = document.body.dataset.agentId || '';

  if (
    !conversation ||
    !(input instanceof HTMLTextAreaElement) ||
    !(sendButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  const initialConversation = conversation.innerHTML;
  let replying = false;
  let ready = false;
  let agentId = '';
  const messages = [];

  function createMessage(role, content) {
    const message = document.createElement('article');
    const avatar = document.createElement('span');
    const avatarIcon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    const avatarUse = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'use',
    );
    const body = document.createElement('div');
    const name = document.createElement('span');
    const bubble = document.createElement('div');
    const paragraph = document.createElement('p');

    message.className = `chat-message ${
      role === 'user' ? 'chat-message--user' : ''
    }`.trim();
    avatar.className = 'chat-message__avatar';
    body.className = 'chat-message__body';
    name.className = 'chat-message__name';
    bubble.className = 'chat-message__bubble';
    name.textContent = role === 'user' ? '我' : '企业知识助手';
    paragraph.textContent = content;
    avatarUse.setAttribute(
      'href',
      role === 'user' ? '#chat-icon-user' : '#chat-icon-bot',
    );

    avatarIcon.appendChild(avatarUse);
    avatar.appendChild(avatarIcon);
    bubble.appendChild(paragraph);
    body.append(name, bubble);
    message.append(avatar, body);
    return message;
  }

  function createTypingMessage() {
    const message = createMessage('assistant', '');
    const bubble = message.querySelector('.chat-message__bubble');

    if (!bubble) {
      return message;
    }

    bubble.innerHTML =
      '<span class="chat-typing" aria-label="正在回复"><i></i><i></i><i></i></span>';
    return message;
  }

  function normalizeApiBase(value) {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }

  function validConfiguredValue(value) {
    return value && !value.includes('{') ? value : '';
  }

  function apiUrl(path) {
    const apiBase = normalizeApiBase(
      query.get('apiBase') || validConfiguredValue(configuredApiBase) || '/api',
    );

    return `${apiBase}${path}`;
  }

  async function request(path, options) {
    const response = await fetch(apiUrl(path), options);
    const responseBody = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new Error(
        responseBody && typeof responseBody.message === 'string'
          ? responseBody.message
          : `服务请求失败（${response.status}）`,
      );
    }

    return responseBody;
  }

  async function initializeBranding() {
    const branding = await request('/branding');

    if (!branding || typeof branding.softwareName !== 'string') {
      return;
    }

    brandNames.forEach((element) => {
      element.textContent = branding.softwareName;
    });
    brandRoots.forEach((element) => {
      element.setAttribute('aria-label', branding.softwareName);
    });

    if (!branding.hasCustomIcon) {
      return;
    }

    brandIcons.forEach((element) => {
      const icon = document.createElement('img');

      icon.alt = '';
      icon.src = apiUrl(
        `/branding/icon?v=${encodeURIComponent(branding.updatedAt || '')}`,
      );
      element.replaceChildren(icon);
    });
  }

  async function initializeAgent() {
    const requestedAgentId =
      query.get('agentId') || validConfiguredValue(configuredAgentId);

    if (!requestedAgentId) {
      throw new Error('请通过 agentId 参数指定要测试的智能体。');
    }

    agentId = requestedAgentId;
    ready = true;
  }

  function scrollToLatest() {
    conversation.scrollTo({
      top: conversation.scrollHeight,
      behavior: 'smooth',
    });
  }

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  }

  function updateSendState() {
    sendButton.disabled = !ready || replying || input.value.trim().length === 0;
  }

  async function sendMessage(question) {
    const content = question.trim();

    if (!content || replying) {
      return;
    }

    replying = true;
    input.value = '';
    resizeInput();
    updateSendState();

    const messageList = conversation.querySelector('[data-chat-messages]');

    if (!messageList) {
      replying = false;
      updateSendState();
      return;
    }

    messageList.appendChild(createMessage('user', content));
    messages.push({ content, role: 'user' });
    const typingMessage = createTypingMessage();
    messageList.appendChild(typingMessage);
    scrollToLatest();

    try {
      const response = await request(`/public/agents/${agentId}/chat`, {
        body: JSON.stringify({ messages }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const answer = response.answer || '模型没有返回有效内容。';

      messages.push({ content: answer, role: 'assistant' });
      typingMessage.replaceWith(createMessage('assistant', answer));
    } catch (error) {
      typingMessage.replaceWith(
        createMessage(
          'assistant',
          error instanceof Error ? error.message : '对话请求失败，请稍后重试。',
        ),
      );
    } finally {
      replying = false;
      updateSendState();
      scrollToLatest();
      input.focus();
    }
  }

  function resetConversation() {
    conversation.innerHTML = initialConversation;
    input.value = '';
    messages.length = 0;
    replying = false;
    resizeInput();
    updateSendState();
    conversation.scrollTop = 0;
    input.focus();
  }

  function setSidebarOpen(open) {
    if (!sidebar || !sidebarBackdrop) {
      return;
    }

    sidebar.classList.toggle('is-open', open);
    sidebarBackdrop.classList.toggle('is-visible', open);
    sidebarBackdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  sendButton.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('input', () => {
    resizeInput();
    updateSendState();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });

  conversation.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const suggestion = target.closest('[data-quick-question]');

    if (suggestion instanceof HTMLElement) {
      sendMessage(suggestion.dataset.quickQuestion || '');
    }
  });

  clearButtons.forEach((button) =>
    button.addEventListener('click', resetConversation),
  );
  historyItems.forEach((item) => {
    item.addEventListener('click', () => {
      historyItems.forEach((historyItem) =>
        historyItem.classList.remove('is-active'),
      );
      item.classList.add('is-active');
      setSidebarOpen(false);
    });
  });

  sidebarOpenButton?.addEventListener('click', () => setSidebarOpen(true));
  sidebarBackdrop?.addEventListener('click', () => setSidebarOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setSidebarOpen(false);
    }
  });

  resizeInput();
  updateSendState();
  initializeBranding().catch(() => undefined);
  initializeAgent()
    .catch((error) => {
      const messageList = conversation.querySelector('[data-chat-messages]');

      messageList?.appendChild(
        createMessage(
          'assistant',
          error instanceof Error ? error.message : '智能体加载失败。',
        ),
      );
    })
    .finally(updateSendState);
})();
