import { describe, expect, it } from 'vitest';

import type { ChartRenderer } from '../domain/chart-renderer';
import { ChartRendererRegistry } from './chart-renderer-registry';

function createRenderer(language: string): ChartRenderer {
  return { language, render: () => Promise.resolve(() => undefined) };
}

describe('ChartRendererRegistry', () => {
  it('按语言注册并解析渲染器', () => {
    const registry = new ChartRendererRegistry();
    const renderer = createRenderer('echarts');
    registry.register(renderer);

    expect(registry.resolve('echarts')).toBe(renderer);
    expect(registry.resolve('unknown')).toBeUndefined();
    expect(registry.languages).toEqual(['echarts']);
  });
});
