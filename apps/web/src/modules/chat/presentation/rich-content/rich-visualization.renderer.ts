import type { ECharts, EChartsOption } from 'echarts';

import { createRandomId } from '@/shared/identity/random-id';

interface D3Datum {
  name: string;
  value: number;
}

interface D3Specification {
  data: D3Datum[];
  type: 'bar' | 'line';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(source: string): Record<string, unknown> {
  const value: unknown = JSON.parse(source);

  if (!isRecord(value)) {
    throw new Error('图表配置必须是 JSON 对象。');
  }

  return value;
}

function readD3Specification(source: string): D3Specification {
  const value = readJson(source);
  const type = value.type === 'line' ? 'line' : 'bar';
  const data = Array.isArray(value.data)
    ? value.data.flatMap((item): D3Datum[] => {
        if (
          !isRecord(item) ||
          typeof item.name !== 'string' ||
          typeof item.value !== 'number'
        ) {
          return [];
        }

        return [{ name: item.name, value: item.value }];
      })
    : [];

  if (!data.length) {
    throw new Error('D3 图表需要包含 name 和 value 的 data 数组。');
  }

  return { data, type };
}

async function renderECharts(
  element: HTMLElement,
  source: string,
): Promise<ECharts> {
  const echarts = await import('echarts');
  const chart = echarts.init(element);

  chart.setOption(readJson(source) as EChartsOption);

  return chart;
}

async function renderMermaid(
  element: HTMLElement,
  source: string,
): Promise<void> {
  const { default: mermaid } = await import('mermaid');

  mermaid.initialize({
    securityLevel: 'strict',
    startOnLoad: false,
    theme: 'neutral',
  });

  // 渲染前先做语法校验，不支持的图类型（如 gauge）在此抛出可读错误。
  await mermaid.parse(source);

  const { svg } = await mermaid.render(`mermaid-${createRandomId()}`, source);

  element.innerHTML = svg;
}

async function renderD3(element: HTMLElement, source: string): Promise<void> {
  const d3 = await import('d3');
  const specification = readD3Specification(source);
  const width = Math.max(element.clientWidth, 560);
  const height = 340;
  const margin = { bottom: 52, left: 52, right: 24, top: 24 };
  const x = d3
    .scaleBand()
    .domain(specification.data.map((item) => item.name))
    .range([margin.left, width - margin.right])
    .padding(0.28);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(specification.data, (item) => item.value) ?? 0])
    .nice()
    .range([height - margin.bottom, margin.top]);
  const svg = d3
    .select(element)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img');

  svg
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));
  svg
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  if (specification.type === 'line') {
    const line = d3
      .line<D3Datum>()
      .x((item) => (x(item.name) ?? 0) + x.bandwidth() / 2)
      .y((item) => y(item.value));

    svg
      .append('path')
      .datum(specification.data)
      .attr('class', 'rich-d3-line')
      .attr('d', line);
    svg
      .append('g')
      .selectAll('circle')
      .data(specification.data)
      .join('circle')
      .attr('cx', (item) => (x(item.name) ?? 0) + x.bandwidth() / 2)
      .attr('cy', (item) => y(item.value))
      .attr('r', 4);
    return;
  }

  svg
    .append('g')
    .selectAll('rect')
    .data(specification.data)
    .join('rect')
    .attr('x', (item) => x(item.name) ?? 0)
    .attr('y', (item) => y(item.value))
    .attr('width', x.bandwidth())
    .attr('height', (item) => y(0) - y(item.value))
    .attr('rx', 5);
}

/** 兜底降级：展示友好错误提示与原始图表代码，保证内容始终可读。 */
function renderFallback(
  element: HTMLElement,
  source: string,
  error: unknown,
): void {
  const message = document.createElement('p');
  message.className = 'rich-visualization__error-message';
  message.textContent = `图表渲染失败，已展示原始内容：${
    error instanceof Error ? error.message : '未知错误'
  }`;

  const code = document.createElement('pre');
  code.className = 'rich-visualization__error-source';
  code.textContent = source;

  element.replaceChildren(message, code);
  element.classList.add('rich-visualization--error');
}

export async function renderVisualizations(
  root: HTMLElement,
): Promise<() => void> {
  const charts: ECharts[] = [];
  const observers: ResizeObserver[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-visualization]');

  await Promise.all(
    [...elements].map(async (element) => {
      const source = decodeURIComponent(element.dataset.source ?? '');

      element.replaceChildren();

      try {
        if (element.dataset.visualization === 'echarts') {
          const chart = await renderECharts(element, source);
          const observer = new ResizeObserver(() => chart.resize());

          observer.observe(element);
          charts.push(chart);
          observers.push(observer);
        } else if (element.dataset.visualization === 'mermaid') {
          await renderMermaid(element, source);
        } else {
          await renderD3(element, source);
        }
      } catch (error) {
        renderFallback(element, source, error);
      }
    }),
  );

  return () => {
    for (const observer of observers) {
      observer.disconnect();
    }
    for (const chart of charts) {
      chart.dispose();
    }
  };
}
