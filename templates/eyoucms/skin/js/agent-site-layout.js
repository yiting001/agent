/**
 * 站点布局适配：自动测量站点固定导航的高度并写入
 * CSS 变量 --chat-site-navigation-height，使对话工作区
 * 始终位于导航下方，不被遮挡。
 */
(function () {
  'use strict';

  const NAVIGATION_HEIGHT_VARIABLE = '--chat-site-navigation-height';
  const workspace = document.querySelector('.chat-workspace');

  if (!workspace) {
    return;
  }

  /** 判断元素是否是覆盖在页面顶部的固定/粘性导航。 */
  function isTopFixedElement(element) {
    if (workspace.contains(element) || element.contains(workspace)) {
      return false;
    }

    const style = window.getComputedStyle(element);

    if (style.position !== 'fixed' && style.position !== 'sticky') {
      return false;
    }

    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    const rect = element.getBoundingClientRect();

    return rect.top <= 1 && rect.height > 0 && rect.width > 0;
  }

  /** 计算所有顶部固定元素的最大底边，即导航占用的高度。 */
  function measureNavigationHeight() {
    let height = 0;

    document.body
      .querySelectorAll('header, nav, [class*="header"], [class*="nav"]')
      .forEach((element) => {
        if (isTopFixedElement(element)) {
          height = Math.max(height, element.getBoundingClientRect().bottom);
        }
      });

    return Math.round(height);
  }

  function applyNavigationHeight() {
    document.documentElement.style.setProperty(
      NAVIGATION_HEIGHT_VARIABLE,
      `${measureNavigationHeight()}px`,
    );
  }

  applyNavigationHeight();
  window.addEventListener('load', applyNavigationHeight);
  window.addEventListener('resize', applyNavigationHeight);

  /** 移动端会话侧栏的展开/收起控制，供其他脚本调用。 */
  const sidebar = document.querySelector('[data-chat-sidebar]');
  const backdrop = document.querySelector('[data-chat-backdrop]');
  const openButton = document.querySelector('[data-chat-sidebar-open]');

  function setSidebarOpen(open) {
    if (!sidebar || !backdrop) {
      return;
    }

    sidebar.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-visible', open);
    backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  openButton?.addEventListener('click', () => setSidebarOpen(true));
  backdrop?.addEventListener('click', () => setSidebarOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setSidebarOpen(false);
    }
  });

  window.AgentSidebar = {
    close: () => setSidebarOpen(false),
    open: () => setSidebarOpen(true),
  };
})();
