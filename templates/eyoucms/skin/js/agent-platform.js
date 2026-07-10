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

  if (
    !conversation ||
    !(input instanceof HTMLTextAreaElement) ||
    !(sendButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  const initialConversation = conversation.innerHTML;
  let replying = false;

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

  function selectResponse(question) {
    if (question.includes('功能') || question.includes('什么')) {
      return '我可以根据企业资料回答产品、服务、流程和常见问题，也能协助梳理需求并生成清晰的建议。你可以继续告诉我具体想了解的内容。';
    }

    if (question.includes('方案') || question.includes('需求')) {
      return '可以。请告诉我你的使用场景、主要用户和希望解决的问题，我会据此整理一份包含目标、核心能力和实施步骤的建议方案。';
    }

    if (question.includes('联系') || question.includes('人工')) {
      return '如果当前回答没有解决你的问题，请留下需要人工跟进的事项，工作人员会结合完整对话内容继续为你处理。';
    }

    return '已经收到你的问题。当前页面使用本地演示回复；接入正式服务后，我会结合后台配置的企业资料生成更准确、可追溯的回答。';
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
    sendButton.disabled = replying || input.value.trim().length === 0;
  }

  function sendMessage(question) {
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
    const typingMessage = createTypingMessage();
    messageList.appendChild(typingMessage);
    scrollToLatest();

    window.setTimeout(() => {
      typingMessage.replaceWith(
        createMessage('assistant', selectResponse(content)),
      );
      replying = false;
      updateSendState();
      scrollToLatest();
      input.focus();
    }, 680);
  }

  function resetConversation() {
    conversation.innerHTML = initialConversation;
    input.value = '';
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
})();
