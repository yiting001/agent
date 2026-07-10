import type { BrandSettings } from '../domain/brand-settings';

export abstract class BrandSettingsGateway {
  abstract get(): Promise<BrandSettings>;
  abstract removeIcon(): Promise<BrandSettings>;
  abstract updateName(softwareName: string): Promise<BrandSettings>;
  abstract uploadIcon(icon: File): Promise<BrandSettings>;
}
