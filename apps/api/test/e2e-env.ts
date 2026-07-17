import { managementTestCredentials } from './management-test-credentials';

process.env.CREDENTIAL_ENCRYPTION_KEY ??= '22'.repeat(32);
process.env.MANAGEMENT_ACCESS_CREDENTIALS = managementTestCredentials();
