export interface BrandSettings {
  hasCustomIcon: boolean;
  iconUrl?: string;
  softwareName: string;
  updatedAt: string;
}

export interface SaveBrandSettingsInput {
  icon?: File;
  removeIcon: boolean;
  softwareName: string;
}
