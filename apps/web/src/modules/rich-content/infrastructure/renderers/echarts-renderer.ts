import type {
  ChartRenderCleanup,
  ChartRenderer,
} from '../../domain/chart-renderer';

/**
 * ECharts 渲染器：代码块内容为 JSON 格式的 ECharts option。
 * 支持折线图、柱状图、饼图、仪表盘等全部 ECharts 图表类型。
 */
export class EChartsRenderer implements ChartRenderer {
  readonly language = 'echarts';

  async render(
    container: HTMLElement,
    code: string,
  ): Promise<ChartRenderCleanup> {
    const option = parseChartOption(code);
    const echarts = await import('echarts');
    const chart = echarts.init(container);
    chart.setOption(option);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }
}

/** 解析并校验图表配置，给出比原生 JSON 报错更友好的提示。 */
function parseChartOption(code: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(code);
  } catch {
    throw new Error('echarts 代码块必须是合法的 JSON 配置');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('echarts 配置必须是 JSON 对象');
  }
  return parsed as Record<string, unknown>;
}
