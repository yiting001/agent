import { webApplicationConfig } from '@/config/application.config';
import { HttpAdminWorkspaceGateway } from '@/modules/admin/infrastructure/http-admin-workspace.gateway';
import { HttpBrandSettingsGateway } from '@/modules/branding/infrastructure/http-brand-settings.gateway';
import { GetSystemStatus } from '@/modules/system/application/get-system-status';
import { HttpHealthStatusGateway } from '@/modules/system/infrastructure/http-health-status.gateway';
import { HttpObservabilityGateway } from '@/modules/observability/infrastructure/http-observability.gateway';
import { FetchHttpClient } from '@/shared/http/http-client';

const httpClient = new FetchHttpClient(webApplicationConfig.apiBaseUrl);
const healthStatusGateway = new HttpHealthStatusGateway(httpClient);
const adminWorkspaceGateway = new HttpAdminWorkspaceGateway(httpClient);
const observabilityGateway = new HttpObservabilityGateway(httpClient);
const brandSettingsGateway = new HttpBrandSettingsGateway(
  httpClient,
  webApplicationConfig.apiBaseUrl,
);

/** Application use cases assembled at the composition root. */
export const applicationDependencies = {
  adminWorkspaceGateway,
  brandSettingsGateway,
  getSystemStatus: new GetSystemStatus(healthStatusGateway),
  observabilityGateway,
};
