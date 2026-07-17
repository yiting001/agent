import { webApplicationConfig } from '@/config/application.config';
import { HttpAdminWorkspaceGateway } from '@/modules/admin/infrastructure/http-admin-workspace.gateway';
import { HttpBrandSettingsGateway } from '@/modules/branding/infrastructure/http-brand-settings.gateway';
import { HttpEvaluationGateway } from '@/modules/evaluation/infrastructure/http-evaluation.gateway';
import { HttpManagementAccessGateway } from '@/modules/management-access/infrastructure/http-management-access.gateway';
import { SessionManagementTokenStorage } from '@/modules/management-access/infrastructure/session-management-token.storage';
import { GetSystemStatus } from '@/modules/system/application/get-system-status';
import { HttpHealthStatusGateway } from '@/modules/system/infrastructure/http-health-status.gateway';
import { HttpObservabilityGateway } from '@/modules/observability/infrastructure/http-observability.gateway';
import { HttpPromptPolicyGateway } from '@/modules/prompt-policies/infrastructure/http-prompt-policy.gateway';
import { FetchHttpClient } from '@/shared/http/http-client';

const httpClient = new FetchHttpClient(webApplicationConfig.apiBaseUrl);
const managementTokenStorage = new SessionManagementTokenStorage();
const managementHttpClient = new FetchHttpClient(
  webApplicationConfig.apiBaseUrl,
  () => managementTokenStorage.read(),
);
const healthStatusGateway = new HttpHealthStatusGateway(httpClient);
const adminWorkspaceGateway = new HttpAdminWorkspaceGateway(httpClient);
const observabilityGateway = new HttpObservabilityGateway(managementHttpClient);
const evaluationGateway = new HttpEvaluationGateway(managementHttpClient);
const managementAccessGateway = new HttpManagementAccessGateway(
  managementHttpClient,
);
const promptPolicyGateway = new HttpPromptPolicyGateway(httpClient);
const brandSettingsGateway = new HttpBrandSettingsGateway(
  httpClient,
  webApplicationConfig.apiBaseUrl,
);

/** Application use cases assembled at the composition root. */
export const applicationDependencies = {
  adminWorkspaceGateway,
  brandSettingsGateway,
  evaluationGateway,
  getSystemStatus: new GetSystemStatus(healthStatusGateway),
  managementAccessGateway,
  managementTokenStorage,
  observabilityGateway,
  promptPolicyGateway,
};
