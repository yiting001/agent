import { webApplicationConfig } from '@/config/application.config';
import { HttpAdminWorkspaceGateway } from '@/modules/admin/infrastructure/http-admin-workspace.gateway';
import { GetSystemStatus } from '@/modules/system/application/get-system-status';
import { HttpHealthStatusGateway } from '@/modules/system/infrastructure/http-health-status.gateway';
import { FetchHttpClient } from '@/shared/http/http-client';

const httpClient = new FetchHttpClient(webApplicationConfig.apiBaseUrl);
const healthStatusGateway = new HttpHealthStatusGateway(httpClient);
const adminWorkspaceGateway = new HttpAdminWorkspaceGateway(httpClient);

/** Application use cases assembled at the composition root. */
export const applicationDependencies = {
  adminWorkspaceGateway,
  getSystemStatus: new GetSystemStatus(healthStatusGateway),
};
