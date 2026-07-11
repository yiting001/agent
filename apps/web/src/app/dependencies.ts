import { webApplicationConfig } from '@/config/application.config';
import { ChartRendererRegistry } from '@/modules/rich-content/application/chart-renderer-registry';
import { EChartsRenderer } from '@/modules/rich-content/infrastructure/renderers/echarts-renderer';
import { MermaidRenderer } from '@/modules/rich-content/infrastructure/renderers/mermaid-renderer';
import { GetSystemStatus } from '@/modules/system/application/get-system-status';
import { HttpHealthStatusGateway } from '@/modules/system/infrastructure/http-health-status.gateway';
import { FetchHttpClient } from '@/shared/http/http-client';

const httpClient = new FetchHttpClient(webApplicationConfig.apiBaseUrl);
const healthStatusGateway = new HttpHealthStatusGateway(httpClient);

const chartRendererRegistry = new ChartRendererRegistry();
chartRendererRegistry.register(new MermaidRenderer());
chartRendererRegistry.register(new EChartsRenderer());

/** Application use cases assembled at the composition root. */
export const applicationDependencies = {
  chartRendererRegistry,
  getSystemStatus: new GetSystemStatus(healthStatusGateway),
};
