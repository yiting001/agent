(function () {
  'use strict';

  const reasons = [
    ['incorrect', '事实错误'],
    ['irrelevant', '内容不相关'],
    ['citation', '引用错误'],
    ['format', '格式不符合'],
    ['model', '模型或路由异常'],
    ['other', '其他'],
  ];

  function create(options) {
    function submit(generationId, rating, reasonCodes, comment) {
      return options.request(
        `/agents/${encodeURIComponent(
          options.getAgentId(),
        )}/generations/${encodeURIComponent(generationId)}/feedback`,
        {
          body: JSON.stringify({
            comment: comment || undefined,
            memoryOwnerToken: options.getMemoryOwnerToken(),
            rating,
            reasonCodes,
          }),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'PUT',
        },
      );
    }

    function append(message, generationId) {
      const body = message.querySelector('.chat-message__body');

      if (
        !body ||
        !generationId ||
        body.querySelector('[data-generation-feedback]')
      ) {
        return;
      }

      const container = document.createElement('div');
      const actions = document.createElement('div');
      const prompt = document.createElement('span');
      const positiveButton = document.createElement('button');
      const negativeButton = document.createElement('button');
      const form = document.createElement('div');
      const reasonList = document.createElement('div');
      const comment = document.createElement('textarea');
      const submitButton = document.createElement('button');
      const status = document.createElement('small');

      container.className = 'chat-feedback';
      container.dataset.generationFeedback = generationId;
      actions.className = 'chat-feedback__actions';
      prompt.textContent = '这条回答是否有帮助？';
      positiveButton.type = 'button';
      positiveButton.textContent = '有帮助';
      negativeButton.type = 'button';
      negativeButton.textContent = '需改进';
      form.className = 'chat-feedback__form';
      form.hidden = true;
      comment.maxLength = 1000;
      comment.placeholder = '可选：补充说明具体问题';
      comment.rows = 3;
      submitButton.type = 'button';
      submitButton.textContent = '提交负向反馈';
      status.className = 'chat-feedback__status';

      for (const [value, labelText] of reasons) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.value = value;
        label.append(checkbox, document.createTextNode(labelText));
        reasonList.appendChild(label);
      }

      positiveButton.addEventListener('click', async () => {
        positiveButton.disabled = true;
        negativeButton.disabled = true;
        status.textContent = '';

        try {
          await submit(generationId, 'positive', [], '');
          positiveButton.classList.add('is-active');
          negativeButton.classList.remove('is-active');
          form.hidden = true;
          status.textContent = '反馈已保存，可再次修改。';
        } catch (error) {
          status.textContent =
            error instanceof Error ? error.message : '反馈提交失败，请重试。';
        } finally {
          positiveButton.disabled = false;
          negativeButton.disabled = false;
        }
      });
      negativeButton.addEventListener('click', () => {
        form.hidden = !form.hidden;
      });
      submitButton.addEventListener('click', async () => {
        const selectedReasons = Array.from(
          reasonList.querySelectorAll('input:checked'),
          (input) => input.value,
        );

        submitButton.disabled = true;
        status.textContent = '';

        try {
          await submit(
            generationId,
            'negative',
            selectedReasons,
            comment.value.trim(),
          );
          negativeButton.classList.add('is-active');
          positiveButton.classList.remove('is-active');
          form.hidden = true;
          status.textContent = '反馈已保存，可再次修改。';
        } catch (error) {
          status.textContent =
            error instanceof Error ? error.message : '反馈提交失败，请重试。';
        } finally {
          submitButton.disabled = false;
        }
      });

      actions.append(prompt, positiveButton, negativeButton);
      form.append(reasonList, comment, submitButton);
      container.append(actions, form, status);
      body.appendChild(container);
    }

    return { append };
  }

  window.AgentFeedback = { create };
})();
