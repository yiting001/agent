import type { BrandSettings } from '../domain/brand-settings';

/** 全局品牌配置的持久化端口。 */
export abstract class BrandSettingsRepository {
  abstract find(): Promise<BrandSettings | undefined>;
  abstract save(settings: BrandSettings): Promise<void>;
}
