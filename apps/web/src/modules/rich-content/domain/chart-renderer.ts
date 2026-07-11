/** 渲染完成后的清理函数，用于释放图表实例、监听器等资源。 */
export type ChartRenderCleanup = () => void;

/**
 * 图表渲染器契约（策略模式）：每种图表语言实现一个渲染器。
 * 渲染失败时应抛出携带可读信息的 Error，由上层统一兜底降级。
 */
export interface ChartRenderer {
  /** 对应 Markdown 围栏代码块的语言标识，如 mermaid、echarts。 */
  readonly language: string;
  render(container: HTMLElement, code: string): Promise<ChartRenderCleanup>;
}
