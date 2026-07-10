(function () {
  'use strict';

  document.documentElement.classList.add('js-enabled');

  function initializeRevealAnimations() {
    const revealElements = document.querySelectorAll('.agent-reveal');

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14 },
    );

    revealElements.forEach((element) => observer.observe(element));
  }

  function initializeModelSelection() {
    const modelOptions = document.querySelectorAll('[data-model-name]');
    const selectedModelLabels = document.querySelectorAll(
      '[data-selected-model]',
    );

    modelOptions.forEach((option) => {
      option.addEventListener('click', () => {
        modelOptions.forEach((item) => item.classList.remove('is-selected'));
        option.classList.add('is-selected');

        selectedModelLabels.forEach((label) => {
          label.textContent = option.dataset.modelName || 'DeepSeek V3';
        });
      });
    });
  }

  function initializeChatDemo() {
    const sendButton = document.querySelector('[data-demo-send]');
    const input = document.querySelector('[data-demo-input]');
    const messages = document.querySelector('[data-demo-messages]');

    if (!sendButton || !(input instanceof HTMLInputElement) || !messages) {
      return;
    }

    function appendMessage(content, modifier) {
      const message = document.createElement('div');
      message.className = `agent-chat__bubble ${modifier}`.trim();
      message.textContent = content;
      messages.appendChild(message);
      messages.scrollTop = messages.scrollHeight;
    }

    function sendMessage() {
      const question = input.value.trim();

      if (!question) {
        input.focus();
        return;
      }

      appendMessage(question, 'agent-chat__bubble--user');
      input.value = '';
      sendButton.setAttribute('disabled', 'disabled');

      window.setTimeout(() => {
        appendMessage(
          '已结合产品知识库生成回答，并保留来源引用与可追溯片段。',
          '',
        );
        sendButton.removeAttribute('disabled');
      }, 520);
    }

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        sendMessage();
      }
    });
  }

  function initializeUploadDemo() {
    const uploadButton = document.querySelector('[data-upload-demo]');
    const progress = document.querySelector('[data-upload-progress]');
    const uploadState = document.querySelector('[data-upload-state]');
    const steps = document.querySelectorAll('[data-pipeline-step]');

    if (!uploadButton || !progress || !uploadState) {
      return;
    }

    uploadButton.addEventListener('click', () => {
      progress.style.width = '0%';
      uploadState.textContent = '正在解析';
      steps.forEach((step) => step.classList.remove('is-active'));

      steps.forEach((step, index) => {
        window.setTimeout(
          () => {
            step.classList.add('is-active');
            progress.style.width = `${((index + 1) / steps.length) * 100}%`;

            if (index === steps.length - 1) {
              uploadState.textContent = '处理完成';
            }
          },
          240 * (index + 1),
        );
      });
    });
  }

  function initializeSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        const targetId = anchor.getAttribute('href');

        if (!targetId || targetId === '#') {
          return;
        }

        const target = document.querySelector(targetId);

        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  initializeRevealAnimations();
  initializeModelSelection();
  initializeChatDemo();
  initializeUploadDemo();
  initializeSmoothAnchors();
})();
