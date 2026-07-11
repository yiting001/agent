import type {
  ChartRenderCleanup,
  ChartRenderer,
} from '../../domain/chart-renderer';

let elementId = 0;

/**
 * Mermaid 渲染器：渲染前先 parse 校验语法。
 * 不支持的图类型（如 gauge）会在校验阶段抛错，交由上层降级展示原文。
 */
export class MermaidRenderer implements ChartRenderer {
  readonly language = 'mermaid';

  async render(
    container: HTMLElement,
    code: string,
  ): Promise<ChartRenderCleanup> {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ securityLevel: 'strict', startOnLoad: false });
    await mermaid.parse(code);
    const { svg } = await mermaid.render(`rich-mermaid-${elementId++}`, code);
    container.innerHTML = svg;
    return () => {
      container.innerHTML = '';
    };
  }
}
