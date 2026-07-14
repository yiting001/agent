const AGENT_BACKEND_BASE_URL = '/api';

/** 可选：固定访问某个智能体的 ID；留空则由访问者在页面上选择。 */
const AGENT_DEFAULT_AGENT_ID = '';

(function () {
  'use strict';

  const conversation = document.querySelector('[data-chat-conversation]');
  const input = document.querySelector('[data-chat-input]');
  const sendButton = document.querySelector('[data-chat-send]');
  const attachmentInput = document.querySelector(
    '[data-chat-attachment-input]',
  );
  const pendingAttachments = document.querySelector(
    '[data-chat-pending-attachments]',
  );
  const attachmentError = document.querySelector(
    '[data-chat-attachment-error]',
  );
  const clearButtons = document.querySelectorAll('[data-chat-clear]');
  const historyNav = document.querySelector('[data-chat-history-list]');
  const query = new URLSearchParams(window.location.search);
  const configuredAgentId = document.body.dataset.agentId || '';

  if (
    !conversation ||
    !(input instanceof HTMLTextAreaElement) ||
    !(sendButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  const initialConversation = Array.from(conversation.childNodes, (node) =>
    node.cloneNode(true),
  );
  let replying = false;
  let ready = false;
  let agentId = '';
  let conversationId = window.AgentMemoryIdentity.createConversationId();
  let memoryOwnerToken = '';
  let attachmentController;
  let conversationStore;
  const richContent = window.AgentRichContent
    ? window.AgentRichContent.create()
    : undefined;
  const messages = [];

  function createMessage(role, content, attachments = []) {
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
    avatarUse.setAttributeNS(
      'http://www.w3.org/1999/xlink',
      'xlink:href',
      role === 'user' ? '#chat-icon-user' : '#chat-icon-bot',
    );

    avatarIcon.appendChild(avatarUse);
    avatar.appendChild(avatarIcon);
    if (attachments.length && attachmentController) {
      bubble.appendChild(
        attachmentController.createMessageGallery(attachments),
      );
    }

    if (content || role === 'assistant') {
      bubble.appendChild(paragraph);
    }
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
    return `${normalizeApiBase(AGENT_BACKEND_BASE_URL)}${path}`;
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

  function uploadAttachment(file) {
    return request('/chat-attachments', {
      body: file,
      headers: {
        'Content-Type': file.type,
        'X-Agent-Id': agentId,
        'X-File-Name': encodeURIComponent(file.name),
        'X-Memory-Owner-Token': memoryOwnerToken,
      },
      method: 'POST',
    });
  }

  async function streamRequest(path, body, onDelta) {
    const response = await fetch(apiUrl(path), {
      body: JSON.stringify(body),
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.json().catch(() => undefined);

      throw new Error(
        errorBody && typeof errorBody.message === 'string'
          ? errorBody.message
          : `服务请求失败（${response.status}）`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      buffer += decoder.decode(result.value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);

      buffer = blocks.pop() || '';

      for (const block of blocks) {
        const eventLine = block
          .split(/\r?\n/)
          .find((line) => line.startsWith('event:'));
        const event = eventLine ? eventLine.slice(6).trim() : 'message';
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');

        if (!data) {
          continue;
        }

        const payload = JSON.parse(data);

        if (event === 'delta' && typeof payload.content === 'string') {
          onDelta(payload.content);
        }

        if (event === 'error') {
          throw new Error(payload.message || '模型流式响应读取失败。');
        }
      }
    }
  }

  async function initializeAgent() {
    memoryOwnerToken = await window.AgentMemoryIdentity.getOwnerToken(request);
    const requestedAgentId =
      query.get('agentId') ||
      validConfiguredValue(configuredAgentId) ||
      AGENT_DEFAULT_AGENT_ID;

    if (requestedAgentId) {
      agentId = requestedAgentId;
      ready = true;
      return;
    }

    if (!window.AgentSelector) {
      throw new Error('请通过 agentId 参数指定要测试的智能体。');
    }

    const agent = await window.AgentSelector.pick({
      container: conversation.querySelector('[data-chat-messages]'),
      loadAgents: () => request('/public/agents'),
    });

    agentId = agent.id;
    ready = true;
    updateSendState();
    focusInput();
  }

  /** 智能体就绪后启用本地会话历史，切换会话时重建消息区。 */
  function setupConversations() {
    if (!window.AgentConversations || !historyNav || !agentId) {
      return;
    }

    conversationStore = window.AgentConversations.create({
      agentId,
      nav: historyNav,
      onSelect: (selected) => {
        conversationId = selected
          ? selected.id
          : window.AgentMemoryIdentity.createConversationId();
        restoreConversation(selected ? selected.messages : []);
        window.AgentSidebar?.close();
      },
    });
  }

  function restoreConversation(savedMessages) {
    conversation.replaceChildren(
      ...initialConversation.map((node) => node.cloneNode(true)),
    );
    messages.length = 0;
    richContent?.reset();
    attachmentController?.reset();

    const messageList = conversation.querySelector('[data-chat-messages]');

    for (const saved of savedMessages) {
      messages.push({ ...saved });

      const element = createMessage(saved.role, saved.content);
      const bubble = element.querySelector('.chat-message__bubble');

      if (saved.role === 'assistant' && richContent && bubble) {
        richContent.render(bubble, saved.content, true);
      }

      messageList?.appendChild(element);
    }

    input.value = '';
    replying = false;
    resizeInput();
    updateSendState();
    scrollToLatest();
    focusInput();
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

  function focusInput() {
    input.focus({ preventScroll: true });
  }

  function updateSendState() {
    const hasContent =
      input.value.trim().length > 0 || attachmentController?.hasPending();

    sendButton.disabled = !ready || replying || !hasContent;
    attachmentController?.setDisabled(!ready || replying);
  }

  async function sendMessage(question) {
    const content = question.trim();

    if ((!content && !attachmentController?.hasPending()) || replying) {
      return;
    }

    replying = true;
    attachmentController?.clearError();
    updateSendState();

    const messageList = conversation.querySelector('[data-chat-messages]');

    if (!messageList) {
      replying = false;
      updateSendState();
      return;
    }

    let typingMessage;
    let answerMessage;
    let answerBubble;
    let answerParagraph;

    try {
      const attachments = attachmentController
        ? await attachmentController.uploadAll()
        : [];
      const attachmentReferences = attachments.map(
        ({ fileName, id, mimeType, sizeBytes }) => ({
          fileName,
          id,
          mimeType,
          sizeBytes,
        }),
      );

      input.value = '';
      resizeInput();
      messageList.appendChild(createMessage('user', content, attachments));
      messages.push({
        ...(attachmentReferences.length
          ? { attachments: attachmentReferences }
          : {}),
        content,
        role: 'user',
      });
      typingMessage = createTypingMessage();
      messageList.appendChild(typingMessage);
      scrollToLatest();
      let answer = '';

      await streamRequest(
        `/public/agents/${agentId}/chat`,
        { conversationId, memoryOwnerToken, messages, stream: true },
        (delta) => {
          answer += delta;

          if (!answerMessage) {
            answerMessage = createMessage('assistant', '');
            answerBubble = answerMessage.querySelector('.chat-message__bubble');
            answerParagraph = answerMessage.querySelector('p');
            typingMessage?.replaceWith(answerMessage);
          }

          if (richContent && answerBubble) {
            richContent.render(answerBubble, answer, false);
          } else if (answerParagraph) {
            answerParagraph.textContent = answer;
          }

          scrollToLatest();
        },
      );

      if (!answer) {
        answer = '模型没有返回有效内容。';
        typingMessage?.replaceWith(createMessage('assistant', answer));
      } else if (richContent && answerBubble) {
        await richContent.render(answerBubble, answer, true);
      }

      messages.push({ content: answer, role: 'assistant' });
      conversationStore?.save(messages, conversationId);
    } catch (error) {
      const errorMessage = createMessage(
        'assistant',
        error instanceof Error ? error.message : '对话请求失败，请稍后重试。',
      );

      if (answerMessage) {
        answerMessage.replaceWith(errorMessage);
      } else if (typingMessage) {
        typingMessage.replaceWith(errorMessage);
      } else {
        messageList.appendChild(errorMessage);
      }
    } finally {
      replying = false;
      updateSendState();
      scrollToLatest();
      focusInput();
    }
  }

  function resetConversation() {
    conversationStore?.startNew();
    conversationId = window.AgentMemoryIdentity.createConversationId();
    restoreConversation([]);
    conversation.scrollTop = 0;
    window.AgentSidebar?.close();

    if (!ready) {
      startAgent();
    }
  }

  if (
    attachmentInput instanceof HTMLInputElement &&
    pendingAttachments instanceof HTMLElement &&
    attachmentError instanceof HTMLElement &&
    window.AgentChatAttachments
  ) {
    attachmentController = window.AgentChatAttachments.create({
      container: pendingAttachments,
      error: attachmentError,
      input: attachmentInput,
      onChange: updateSendState,
      upload: uploadAttachment,
    });
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

  function startAgent() {
    initializeAgent()
      .then(setupConversations)
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
  }

  resizeInput();
  updateSendState();
  window.AgentBranding?.apply({ apiUrl, request }).catch(() => undefined);
  startAgent();
})();
