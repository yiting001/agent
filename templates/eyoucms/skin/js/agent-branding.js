/**
 * 品牌信息适配：从后台品牌接口读取软件名称与图标，
 * 应用到页面上标记了 data-brand-* 的元素。
 */
(function () {
  'use strict';

  /**
   * 加载并应用品牌信息。
   * @param {Object} options
   * @param {Function} options.request 请求后台接口的异步函数。
   * @param {Function} options.apiUrl 拼接后台地址的函数。
   */
  async function apply(options) {
    const branding = await options.request('/branding');

    if (!branding || typeof branding.softwareName !== 'string') {
      return;
    }

    document.querySelectorAll('[data-brand-name]').forEach((element) => {
      element.textContent = branding.softwareName;
    });
    document.querySelectorAll('[data-brand-root]').forEach((element) => {
      element.setAttribute('aria-label', branding.softwareName);
    });

    if (!branding.hasCustomIcon) {
      return;
    }

    document.querySelectorAll('[data-brand-icon]').forEach((element) => {
      const icon = document.createElement('img');

      icon.alt = '';
      icon.src = options.apiUrl(
        `/branding/icon?v=${encodeURIComponent(branding.updatedAt || '')}`,
      );
      element.replaceChildren(icon);
    });
  }

  window.AgentBranding = { apply };
})();
