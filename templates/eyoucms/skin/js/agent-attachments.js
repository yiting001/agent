(function () {
  'use strict';

  const MAX_ATTACHMENTS = 6;
  const SUPPORTED_TYPES = new Set([
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  function createPreview(attachment) {
    if (attachment.mimeType.startsWith('image/')) {
      const image = document.createElement('img');

      image.alt = attachment.fileName;
      image.src = attachment.previewUrl;
      return image;
    }

    const audio = document.createElement('audio');

    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = attachment.previewUrl;
    return audio;
  }

  function createAttachmentFigure(attachment, remove) {
    const figure = document.createElement('figure');
    const caption = document.createElement('figcaption');

    figure.appendChild(createPreview(attachment));
    caption.textContent = attachment.fileName;
    figure.appendChild(caption);

    if (remove) {
      const button = document.createElement('button');

      button.type = 'button';
      button.setAttribute('aria-label', `移除附件 ${attachment.fileName}`);
      button.innerHTML =
        '<svg aria-hidden="true"><use href="#chat-icon-close" xlink:href="#chat-icon-close"></use></svg>';
      button.addEventListener('click', remove);
      figure.appendChild(button);
    }

    return figure;
  }

  function createController(options) {
    const pending = [];
    const previewUrls = new Set();

    function showError(message) {
      options.error.textContent = message;
      options.error.hidden = !message;
    }

    function render() {
      options.container.replaceChildren(
        ...pending.map((attachment, index) =>
          createAttachmentFigure(attachment, () => remove(index)),
        ),
      );
      options.container.hidden = pending.length === 0;
      options.onChange();
    }

    function remove(index) {
      const [attachment] = pending.splice(index, 1);

      if (attachment) {
        URL.revokeObjectURL(attachment.previewUrl);
        previewUrls.delete(attachment.previewUrl);
      }

      showError('');
      render();
    }

    function select(event) {
      const target = event.target;

      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      showError('');

      for (const file of target.files || []) {
        if (pending.length >= MAX_ATTACHMENTS) {
          showError(`每条消息最多选择 ${MAX_ATTACHMENTS} 个附件。`);
          break;
        }

        if (!SUPPORTED_TYPES.has(file.type)) {
          showError(`${file.name} 的格式不受支持。`);
          continue;
        }

        const previewUrl = URL.createObjectURL(file);

        previewUrls.add(previewUrl);
        pending.push({
          file,
          fileName: file.name,
          mimeType: file.type,
          previewUrl,
        });
      }

      target.value = '';
      render();
    }

    options.input.addEventListener('change', select);

    return {
      clearError() {
        showError('');
      },
      createMessageGallery(attachments) {
        const gallery = document.createElement('div');

        gallery.className = 'chat-message-attachments';
        gallery.append(
          ...attachments.map((attachment) =>
            createAttachmentFigure(attachment),
          ),
        );
        return gallery;
      },
      hasPending() {
        return pending.length > 0;
      },
      reset() {
        for (const previewUrl of previewUrls) {
          URL.revokeObjectURL(previewUrl);
        }

        previewUrls.clear();
        pending.length = 0;
        showError('');
        render();
      },
      setDisabled(disabled) {
        options.input.disabled = disabled;
        options.input
          .closest('.chat-attachment-button')
          ?.classList.toggle('is-disabled', disabled);
      },
      async uploadAll() {
        const attachments = await Promise.all(
          pending.map(async (attachment) => ({
            ...(await options.upload(attachment.file)),
            previewUrl: attachment.previewUrl,
          })),
        );

        pending.length = 0;
        render();
        return attachments;
      },
    };
  }

  window.AgentChatAttachments = { create: createController };
})();
