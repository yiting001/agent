/** 富内容渲染库的基础地址；内网部署时改为自托管目录，例如 "/static/vendor"。 */
const AGENT_RICH_ASSET_BASE_URL = 'https://cdn.jsdelivr.net/npm';

/** 各渲染库路径与 Vue 管理端依赖版本保持一致，升级时需同步修改。 */
const AGENT_RICH_LIBRARIES = {
  echarts: 'echarts@6.1.0/dist/echarts.min.js',
  katex: 'katex@0.16.47/dist/katex.min.js',
  katexAutoRender: 'katex@0.16.47/dist/contrib/auto-render.min.js',
  katexStyle: 'katex@0.16.47/dist/katex.min.css',
  markdownIt: 'markdown-it@14.2.0/dist/markdown-it.min.js',
  mermaid: 'mermaid@11.16.0/dist/mermaid.min.js',
};

(function () {
  'use strict';

  /** 使用可视化代码块语言标识区分普通代码与图表。 */
  const VISUALIZATION_TYPES = new Set(['echarts', 'mermaid']);
  const MATH_DELIMITERS = [
    { display: true, left: '$$', right: '$$' },
    { display: false, left: '$', right: '$' },
    { display: true, left: '\\[', right: '\\]' },
    { display: false, left: '\\(', right: '\\)' },
  ];
  const loaders = new Map();
  let markdown;
  let mermaidReady = false;

  function assetUrl(library) {
    const base = AGENT_RICH_ASSET_BASE_URL.endsWith('/')
      ? AGENT_RICH_ASSET_BASE_URL.slice(0, -1)
      : AGENT_RICH_ASSET_BASE_URL;

    return `${base}/${AGENT_RICH_LIBRARIES[library]}`;
  }

  /** 按需加载脚本或样式，同一资源只请求一次。 */
  function loadAsset(library, kind) {
    if (loaders.has(library)) {
      return loaders.get(library);
    }

    const promise = new Promise((resolve, reject) => {
      let element;

      if (kind === 'style') {
        element = document.createElement('link');
        element.rel = 'stylesheet';
        element.href = assetUrl(library);
      } else {
        element = document.createElement('script');
        element.src = assetUrl(library);
      }

      element.addEventListener('load', () => resolve());
      element.addEventListener('error', () => {
        loaders.delete(library);
        reject(new Error(`渲染资源 ${library} 加载失败。`));
      });
      document.head.appendChild(element);
    });

    loaders.set(library, promise);
    return promise;
  }

  function visualizationPlaceholder(type, source) {
    const placeholder = [
      `<div class="chat-visualization" data-visualization="${type}"`,
      ` data-source="${encodeURIComponent(source)}">`,
      '<span class="chat-visualization__loading">图表生成中…</span>',
      '</div>',
    ];

    return placeholder.join('');
  }

  /** Markdown 渲染禁用原始 HTML，避免模型输出脚本进入页面。 */
  async function getMarkdown() {
    if (markdown) {
      return markdown;
    }

    await loadAsset('markdownIt', 'script');
    markdown = window.markdownit({
      breaks: true,
      html: false,
      linkify: true,
      typographer: true,
    });

    const renderFence = markdown.renderer.rules.fence;

    markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
      const token = tokens[index];
      const type = token.info.trim().toLowerCase();

      if (VISUALIZATION_TYPES.has(type)) {
        return visualizationPlaceholder(type, token.content);
      }

      return renderFence(tokens, index, options, env, self);
    };

    return markdown;
  }

  async function renderMath(element) {
    if (!/\$|\\\(|\\\[/.test(element.textContent || '')) {
      return;
    }

    await Promise.all([
      loadAsset('katexStyle', 'style'),
      loadAsset('katex', 'script').then(() =>
        loadAsset('katexAutoRender', 'script'),
      ),
    ]);
    window.renderMathInElement(element, {
      delimiters: MATH_DELIMITERS,
      throwOnError: false,
    });
  }

  /** ECharts 直接使用回答中的 JSON 配置，支持柱状、折线、饼图和仪表盘等。 */
  async function renderECharts(element) {
    await loadAsset('echarts', 'script');
    const chart = window.echarts.init(element);

    chart.setOption(JSON.parse(decodeURIComponent(element.dataset.source)));
    return chart;
  }

  async function renderMermaid(element) {
    await loadAsset('mermaid', 'script');

    if (!mermaidReady) {
      window.mermaid.initialize({
        securityLevel: 'strict',
        startOnLoad: false,
        theme: 'neutral',
      });
      mermaidReady = true;
    }

    const { svg } = await window.mermaid.render(
      `chat-mermaid-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      decodeURIComponent(element.dataset.source),
    );

    element.innerHTML = svg;
  }

  async function renderVisualization(element, charts) {
    element.replaceChildren();

    try {
      if (element.dataset.visualization === 'echarts') {
        charts.push(await renderECharts(element));
      } else {
        await renderMermaid(element);
      }
    } catch (error) {
      element.textContent =
        error instanceof Error ? error.message : '图表渲染失败。';
      element.classList.add('chat-visualization--error');
    }
  }

  function createController() {
    const charts = [];
    let queue = Promise.resolve();

    /**
     * 渲染 Markdown、公式与表格；final 为真时再渲染图表，
     * 避免流式输出中的半截 JSON 反复渲染失败。
     */
    async function render(element, content, final) {
      try {
        const renderer = await getMarkdown();

        element.innerHTML = renderer.render(content);
        await renderMath(element);
      } catch {
        element.textContent = content;
        return;
      }

      if (!final) {
        return;
      }

      const targets = element.querySelectorAll('[data-visualization]');

      await Promise.all(
        [...targets].map((target) => renderVisualization(target, charts)),
      );
    }

    return {
      /** 渲染按调用顺序串行执行，避免流式增量出现乱序覆盖。 */
      render(element, content, final) {
        queue = queue
          .then(() => render(element, content, Boolean(final)))
          .catch(() => undefined);
        return queue;
      },
      reset() {
        for (const chart of charts.splice(0)) {
          chart.dispose();
        }
      },
    };
  }

  window.AgentRichContent = { create: createController };
})();
