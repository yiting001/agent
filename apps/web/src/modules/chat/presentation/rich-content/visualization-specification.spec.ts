import { describe, expect, it } from 'vitest';

import {
  parseD3Specification,
  parseEChartsOption,
  parseSafeVisualizationJson,
  parseThreeScene,
} from './visualization-specification';

describe('visualization specifications', () => {
  it('accepts structured ECharts and D3 JSON including negative values', () => {
    expect(
      parseEChartsOption(
        '{"xAxis":{"type":"category","data":["收入"]},"series":[{"type":"bar","data":[120]}]}',
      ),
    ).toEqual(expect.objectContaining({ series: expect.any(Array) }));
    expect(
      parseD3Specification(
        '{"type":"bar","data":[{"name":"收入","value":120},{"name":"成本","value":-30}]}',
      ),
    ).toEqual({
      data: [
        { name: '收入', value: 120 },
        { name: '成本', value: -30 },
      ],
      type: 'bar',
    });
  });

  it('parses a bounded Three.js primitive scene with defaults', () => {
    expect(
      parseThreeScene(
        '{"background":"#ffffff","objects":[{"type":"box","size":[2,1,3],"color":"#7765e8"}]}',
      ),
    ).toEqual(
      expect.objectContaining({
        autoRotate: true,
        background: '#ffffff',
        objects: [
          expect.objectContaining({
            position: [0, 0, 0],
            size: [2, 1, 3],
            type: 'box',
          }),
        ],
      }),
    );
  });

  it('rejects external resources, dangerous keys and unsupported geometry', () => {
    expect(() =>
      parseSafeVisualizationJson(
        '{"image":"https://tracker.example/chart.png"}',
      ),
    ).toThrow('不允许外链资源');
    expect(() =>
      parseSafeVisualizationJson('{"__proto__":{"polluted":true}}'),
    ).toThrow('__proto__');
    expect(() =>
      parseThreeScene('{"objects":[{"type":"gltf","url":"model.glb"}]}'),
    ).toThrow('仅支持');
  });

  it('never executes JavaScript supplied as visualization source', () => {
    globalThis.__visualizationExecuted = false;

    expect(() =>
      parseSafeVisualizationJson(
        '(() => { globalThis.__visualizationExecuted = true; })()',
      ),
    ).toThrow();
    expect(globalThis.__visualizationExecuted).toBe(false);

    delete globalThis.__visualizationExecuted;
  });
});

declare global {
  var __visualizationExecuted: boolean | undefined;
}
