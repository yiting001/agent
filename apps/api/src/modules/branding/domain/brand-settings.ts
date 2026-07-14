/** 全局唯一品牌设置标识。 */
export const GLOBAL_BRAND_SETTINGS_ID = 'global';

/** API 持久化的全局品牌设置。 */
export interface BrandSettings {
  createdAt: Date;
  iconMimeType?: string;
  /** 图标对象存储内部键，不应直接暴露给前端。 */
  iconStorageKey?: string;
  id: string;
  softwareName: string;
  updatedAt: Date;
}

/** 对公开页面安全的品牌设置视图。 */
export interface BrandSettingsSummary {
  hasCustomIcon: boolean;
  softwareName: string;
  updatedAt: string;
}

/** 将内部图标存储状态转换为公开摘要。 */
export function summarizeBrandSettings(
  settings: BrandSettings,
): BrandSettingsSummary {
  return {
    hasCustomIcon: Boolean(settings.iconStorageKey),
    softwareName: settings.softwareName,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
