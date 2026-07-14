import { describe, expect, it } from 'vitest';

import { prepareECharts } from './echarts-runtime';

describe('prepareECharts', () => {
  it.each(['bar', 'graph', 'map', 'gauge'])(
    'loads the ECharts family for %s series',
    async (type) => {
      const runtime = await prepareECharts({ series: [{ type }] });

      expect(runtime.init).toBeTypeOf('function');
    },
  );

  it('accepts component-only options without loading a chart family', async () => {
    const runtime = await prepareECharts({
      dataset: { source: [['name', 'value']] },
      title: { text: '统计' },
    });

    expect(runtime.use).toBeTypeOf('function');
  });
});
