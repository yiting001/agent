import type { ChartRenderer } from '../domain/chart-renderer';

/**
 * 图表渲染器注册表：按语言标识查找渲染器。
 * 新增图表类型（如 D3 自定义图）只需注册新的渲染器，无需改动渲染流程。
 */
export class ChartRendererRegistry {
  private readonly renderers = new Map<string, ChartRenderer>();

  register(renderer: ChartRenderer): void {
    this.renderers.set(renderer.language, renderer);
  }

  resolve(language: string): ChartRenderer | undefined {
    return this.renderers.get(language);
  }

  /** 已注册的全部语言标识，供内容切分时识别图表片段。 */
  get languages(): readonly string[] {
    return [...this.renderers.keys()];
  }
}
