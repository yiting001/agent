import type { ManagementSession } from '../domain/management-access';

export abstract class ManagementAccessGateway {
  abstract getSession(): Promise<ManagementSession>;
}
