<script setup lang="ts">
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import type { ECharts } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { ObservabilityDashboard } from '../../domain/observability-dashboard';
import { formatCost, formatDateTime } from '../observability-display';

const props = defineProps<{
  series: ObservabilityDashboard['series'];
}>();

echarts.use([
  BarChart,
  CanvasRenderer,
  GridComponent,
  LegendComponent,
  LineChart,
  TooltipComponent,
]);

interface TooltipPoint {
  dataIndex?: number;
  marker?: string;
  seriesName?: string;
  value?: unknown;
}

const chartElement = ref<HTMLDivElement>();
let chart: ECharts | undefined;
let resizeObserver: ResizeObserver | undefined;

const totals = computed(() =>
  props.series.reduce(
    (summary, point) => ({
      costUsd: summary.costUsd + point.costUsd,
      errors: summary.errors + point.errorCount,
      models: summary.models + point.modelCallCount,
      requests: summary.requests + point.requestCount,
    }),
    { costUsd: 0, errors: 0, models: 0, requests: 0 },
  ),
);

const chartOption = computed<EChartsOption>(() => ({
  color: ['#4f7cff', '#22a06b', '#d95656', '#7c5cff'],
  grid: {
    bottom: 34,
    left: 46,
    right: 48,
    top: 54,
  },
  legend: {
    icon: 'roundRect',
    itemGap: 16,
    itemHeight: 8,
    itemWidth: 10,
    right: 0,
    textStyle: {
      color: '#74798c',
      fontSize: 11,
      fontWeight: 700,
    },
    top: 2,
  },
  series: [
    {
      barMaxWidth: 22,
      data: props.series.map((point) => point.requestCount),
      emphasis: { focus: 'series' },
      itemStyle: { borderRadius: [5, 5, 0, 0] },
      name: '请求',
      type: 'bar',
    },
    {
      data: props.series.map((point) => point.modelCallCount),
      lineStyle: { width: 3 },
      name: '模型调用',
      showSymbol: false,
      smooth: true,
      symbolSize: 7,
      type: 'line',
    },
    {
      data: props.series.map((point) => point.errorCount),
      lineStyle: { width: 2 },
      name: '错误',
      showSymbol: props.series.some((point) => point.errorCount > 0),
      smooth: true,
      symbolSize: 7,
      type: 'line',
    },
    {
      data: props.series.map((point) => Number(point.costUsd.toFixed(6))),
      lineStyle: { type: 'dashed', width: 2 },
      name: '成本',
      showSymbol: false,
      smooth: true,
      type: 'line',
      yAxisIndex: 1,
    },
  ],
  tooltip: {
    axisPointer: {
      lineStyle: {
        color: '#b9bed0',
        type: 'dashed',
      },
    },
    backgroundColor: '#252739',
    borderWidth: 0,
    formatter: (value: unknown): string => formatTooltip(value),
    padding: [10, 12],
    textStyle: {
      color: '#ffffff',
      fontSize: 12,
    },
    trigger: 'axis',
  },
  xAxis: {
    axisLabel: {
      color: '#9196a8',
      fontSize: 10,
      hideOverlap: true,
    },
    axisLine: { lineStyle: { color: '#e6e8f0' } },
    axisTick: { show: false },
    boundaryGap: true,
    data: props.series.map((point) => formatAxisLabel(point.startedAt)),
    type: 'category',
  },
  yAxis: [
    {
      axisLabel: {
        color: '#9196a8',
        fontSize: 10,
      },
      minInterval: 1,
      splitLine: { lineStyle: { color: '#eef0f6' } },
      type: 'value',
    },
    {
      axisLabel: {
        color: '#9196a8',
        fontSize: 10,
        formatter: (value: number): string =>
          `$${value.toFixed(value >= 1 ? 0 : 3)}`,
      },
      splitLine: { show: false },
      type: 'value',
    },
  ],
}));

function formatAxisLabel(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function isTooltipPoints(value: unknown): value is TooltipPoint[] {
  return Array.isArray(value);
}

function formatTooltip(value: unknown): string {
  if (!isTooltipPoints(value) || !value.length) {
    return '';
  }

  const firstPoint = value[0];

  if (!firstPoint) {
    return '';
  }

  const sourcePoint =
    typeof firstPoint.dataIndex === 'number'
      ? props.series[firstPoint.dataIndex]
      : undefined;
  const heading = sourcePoint ? formatDateTime(sourcePoint.startedAt) : '';
  const rows = value
    .map((point) => {
      const rawValue = typeof point.value === 'number' ? point.value : 0;
      const formattedValue =
        point.seriesName === '成本' ? formatCost(rawValue) : rawValue;

      return `<span class="observability-tooltip__row">${point.marker ?? ''}<span>${point.seriesName ?? ''}</span><strong>${formattedValue}</strong></span>`;
    })
    .join('');

  return `<div class="observability-tooltip"><strong>${heading}</strong>${rows}</div>`;
}

function renderChart(): void {
  chart?.setOption(chartOption.value, true);
}

onMounted(() => {
  if (!chartElement.value) {
    return;
  }

  chart = echarts.init(chartElement.value);
  renderChart();

  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(chartElement.value);
});

watch(
  () => props.series,
  () => renderChart(),
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<template>
  <section class="panel-card observability-trend">
    <header class="panel-card__header">
      <div>
        <h2>运行趋势</h2>
        <p>请求、错误、模型调用与成本按时间窗口聚合。</p>
      </div>
    </header>
    <div class="observability-chart-wrap">
      <div
        ref="chartElement"
        class="observability-chart"
        role="img"
        aria-label="运行趋势图"
      ></div>
    </div>
    <div class="observability-trend__summary" aria-label="趋势汇总">
      <span>
        <small>请求</small>
        <strong>{{ totals.requests }}</strong>
      </span>
      <span>
        <small>模型</small>
        <strong>{{ totals.models }}</strong>
      </span>
      <span>
        <small>错误</small>
        <strong>{{ totals.errors }}</strong>
      </span>
      <span>
        <small>成本</small>
        <strong>{{ formatCost(totals.costUsd) }}</strong>
      </span>
    </div>
  </section>
</template>
