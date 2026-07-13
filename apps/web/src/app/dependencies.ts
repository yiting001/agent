import { webApplicationConfig } from '@/config/application.config';
import { HttpKnowledgeEntryGateway } from '@/modules/knowledge/infrastructure/http-knowledge-entry.gateway';
import { GetSystemStatus } from '@/modules/system/application/get-system-status';
import { HttpHealthStatusGateway } from '@/modules/system/infrastructure/http-health-status.gateway';
import { FetchHttpClient } from '@/shared/http/http-client';

const httpClient = new FetchHttpClient(webApplicationConfig.apiBaseUrl);
const healthStatusGateway = new HttpHealthStatusGateway(httpClient);

/** Feature dependencies assembled at the composition root. */
export const applicationDependencies = {
  getSystemStatus: new GetSystemStatus(healthStatusGateway),
  knowledgeEntries: new HttpKnowledgeEntryGateway(httpClient),
};
