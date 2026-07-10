import type { HttpClient } from '@/shared/http/http-client';

import { BrandSettingsGateway } from '../application/brand-settings.gateway';
import type { BrandSettings } from '../domain/brand-settings';

interface BrandSettingsResponse {
  hasCustomIcon: boolean;
  softwareName: string;
  updatedAt: string;
}

export class HttpBrandSettingsGateway extends BrandSettingsGateway {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly apiBaseUrl: string,
  ) {
    super();
  }

  async get(): Promise<BrandSettings> {
    return this.toDomain(
      await this.httpClient.get<BrandSettingsResponse>('/branding'),
    );
  }

  async removeIcon(): Promise<BrandSettings> {
    return this.toDomain(
      await this.httpClient.delete<BrandSettingsResponse>('/branding/icon'),
    );
  }

  async updateName(softwareName: string): Promise<BrandSettings> {
    return this.toDomain(
      await this.httpClient.put<
        BrandSettingsResponse,
        { softwareName: string }
      >('/branding', { softwareName }),
    );
  }

  async uploadIcon(icon: File): Promise<BrandSettings> {
    return this.toDomain(
      await this.httpClient.putFile<BrandSettingsResponse>(
        '/branding/icon',
        icon,
      ),
    );
  }

  private toDomain(response: BrandSettingsResponse): BrandSettings {
    return {
      ...response,
      iconUrl: response.hasCustomIcon
        ? this.buildIconUrl(response.updatedAt)
        : undefined,
    };
  }

  private buildIconUrl(updatedAt: string): string {
    const baseUrl = this.apiBaseUrl.endsWith('/')
      ? this.apiBaseUrl.slice(0, -1)
      : this.apiBaseUrl;

    return new URL(
      `${baseUrl}/branding/icon?v=${encodeURIComponent(updatedAt)}`,
      window.location.origin,
    ).toString();
  }
}
