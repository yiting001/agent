/**
 * 智能体选择器：页面未配置智能体 ID 时，
 * 从公开接口加载平台已发布智能体列表，让访问者自行选择要对话的智能体。
 * 选择结果通过 Promise 返回给对话脚本。
 */
(function () {
  'use strict';

  /** 构建单个可点击的智能体选项按钮。 */
  function createOption(agent, onSelect) {
    const option = document.createElement('button');
    const name = document.createElement('strong');
    const description = document.createElement('span');

    option.type = 'button';
    option.className = 'chat-agent-picker__option';
    name.textContent = agent.name;
    description.textContent = agent.description || '暂无介绍';
    option.append(name, description);
    option.addEventListener('click', () => onSelect(agent));
    return option;
  }

  /** 构建选择器面板，包含标题与选项列表。 */
  function createPanel(agents, onSelect) {
    const panel = document.createElement('section');
    const title = document.createElement('h2');
    const list = document.createElement('div');

    panel.className = 'chat-agent-picker';
    title.className = 'chat-agent-picker__title';
    title.textContent = '请选择要对话的智能体';
    list.className = 'chat-agent-picker__list';
    agents.forEach((agent) => list.appendChild(createOption(agent, onSelect)));
    panel.append(title, list);
    return panel;
  }

  /**
   * 加载智能体并等待访问者选择。
   * @param {Object} options
   * @param {Element} options.container 选择器插入位置（消息列表）。
   * @param {Function} options.loadAgents 返回智能体数组的异步函数。
   * @returns {Promise<{id: string, name: string}>} 选中的智能体。
   */
  async function pick(options) {
    const agents = await options.loadAgents();

    if (!Array.isArray(agents) || agents.length === 0) {
      throw new Error('当前没有可对话的已发布智能体，请先在后台发布智能体。');
    }

    return new Promise((resolve) => {
      const panel = createPanel(agents, (agent) => {
        panel.remove();
        resolve(agent);
      });

      options.container.appendChild(panel);
    });
  }

  window.AgentSelector = { pick };
})();
