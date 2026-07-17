import type { ManagementPrincipal } from '../domain/management-access';

/** Authenticates a raw credential without exposing its configured representation. */
export abstract class ManagementAuthenticator {
  abstract authenticate(token: string): ManagementPrincipal;
}
