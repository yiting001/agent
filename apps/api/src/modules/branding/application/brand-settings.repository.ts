import type { BrandSettings } from '../domain/brand-settings';

export abstract class BrandSettingsRepository {
  abstract find(): Promise<BrandSettings | undefined>;
  abstract save(settings: BrandSettings): Promise<void>;
}
