import type { EChartsOption } from 'echarts';
import type { ECharts } from 'echarts/core';

import { createRandomId } from '@/shared/identity/random-id';

import { renderThreeVisualization } from './three-visualization.renderer';
import type { D3Datum } from './visualization-specification';
import {
  parseD3Specification,
  parseEChartsOption,
} from './visualization-specification';

async function renderECharts(
  element: HTMLElement,
  source: string,
): Promise<ECharts> {
  const option = parseEChartsOption(source);
  const { prepareECharts } = await import('./echarts-runtime');
  const echarts = await prepareECharts(option);
  const chart = echarts.init(element);

  chart.setOption(option as EChartsOption);

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
  const specification = parseD3Specification(source);
  const width = Math.max(element.clientWidth, 560);
  const height = 340;
  const margin = { bottom: 52, left: 52, right: 24, top: 24 };
  const x = d3
    .scaleBand()
    .domain(specification.data.map((item) => item.name))
    .range([margin.left, width - margin.right])
    .padding(0.28);
  const minimum = d3.min(specification.data, (item) => item.value) ?? 0;
  const maximum = d3.max(specification.data, (item) => item.value) ?? 0;
  const y = d3
    .scaleLinear()
    .domain([Math.min(0, minimum), Math.max(0, maximum)])
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
    .attr('y', (item) => y(Math.max(0, item.value)))
    .attr('width', x.bandwidth())
    .attr('height', (item) => Math.abs(y(item.value) - y(0)))
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
  const disposers: Array<() => void> = [];
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
        } else if (element.dataset.visualization === 'd3') {
          await renderD3(element, source);
        } else if (element.dataset.visualization === 'three') {
          disposers.push(await renderThreeVisualization(element, source));
        } else {
          throw new Error('不支持的可视化类型。');
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
    for (const dispose of disposers) {
      dispose();
    }
  };
}
