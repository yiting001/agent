/** 导航、登录页和浏览器标题共享的品牌视图。 */
export interface BrandSettings {
  hasCustomIcon: boolean;
  iconUrl?: string;
  softwareName: string;
  updatedAt: string;
}

/** 品牌设置表单提交内容。 */
export interface SaveBrandSettingsInput {
  icon?: File;
  removeIcon: boolean;
  softwareName: string;
}
