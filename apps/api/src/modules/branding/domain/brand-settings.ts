export const GLOBAL_BRAND_SETTINGS_ID = 'global';

export interface BrandSettings {
  createdAt: Date;
  iconMimeType?: string;
  iconStorageKey?: string;
  id: string;
  softwareName: string;
  updatedAt: Date;
}

export interface BrandSettingsSummary {
  hasCustomIcon: boolean;
  softwareName: string;
  updatedAt: string;
}

export function summarizeBrandSettings(
  settings: BrandSettings,
): BrandSettingsSummary {
  return {
    hasCustomIcon: Boolean(settings.iconStorageKey),
    softwareName: settings.softwareName,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
