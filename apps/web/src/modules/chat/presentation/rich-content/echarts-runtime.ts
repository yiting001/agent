import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

const chartFamilies = {
  cartesian: new Set([
    'bar',
    'boxplot',
    'candlestick',
    'effectScatter',
    'heatmap',
    'line',
    'pictorialBar',
    'scatter',
  ]),
  hierarchy: new Set([
    'chord',
    'graph',
    'sankey',
    'sunburst',
    'tree',
    'treemap',
  ]),
  map: new Set(['lines', 'map']),
  specialty: new Set([
    'custom',
    'funnel',
    'gauge',
    'parallel',
    'pie',
    'radar',
    'themeRiver',
  ]),
};

echarts.use([CanvasRenderer]);

function readSeriesTypes(option: Record<string, unknown>): Set<string> {
  const series = Array.isArray(option.series)
    ? option.series
    : option.series
      ? [option.series]
      : [];

  return new Set(
    series.flatMap((item) =>
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      typeof item.type === 'string'
        ? [item.type]
        : [],
    ),
  );
}

/** 按图表系列加载能力，同时将通用组件拆成独立异步 chunk。 */
export async function prepareECharts(
  option: Record<string, unknown>,
): Promise<typeof echarts> {
  const seriesTypes = readSeriesTypes(option);
  const loaders: Promise<unknown>[] = [
    import('./echarts-components-layout'),
    import('./echarts-components-display'),
  ];

  if ([...seriesTypes].some((type) => chartFamilies.cartesian.has(type))) {
    loaders.push(import('./echarts-charts-cartesian'));
  }

  if ([...seriesTypes].some((type) => chartFamilies.hierarchy.has(type))) {
    loaders.push(import('./echarts-charts-hierarchy'));
  }

  if ([...seriesTypes].some((type) => chartFamilies.map.has(type))) {
    loaders.push(import('./echarts-charts-map'));
  }

  if ([...seriesTypes].some((type) => chartFamilies.specialty.has(type))) {
    loaders.push(import('./echarts-charts-specialty'));
  }

  await Promise.all(loaders);

  return echarts;
}
