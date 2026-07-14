import type { BrandSettings } from '../domain/brand-settings';

/** 品牌设置读取、名称更新和图标生命周期的应用层端口。 */
export abstract class BrandSettingsGateway {
  abstract get(): Promise<BrandSettings>;
  abstract removeIcon(): Promise<BrandSettings>;
  abstract updateName(softwareName: string): Promise<BrandSettings>;
  abstract uploadIcon(icon: File): Promise<BrandSettings>;
}
