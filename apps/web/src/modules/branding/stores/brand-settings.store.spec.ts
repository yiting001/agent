import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { applicationDependencies } from '@/app/dependencies';

import { useBrandSettingsStore } from './brand-settings.store';

const customBrand = {
  hasCustomIcon: true,
  iconUrl: 'http://localhost/api/branding/icon?v=1',
  softwareName: '企业智能中枢',
  updatedAt: '2026-07-10T00:00:00.000Z',
};

describe('useBrandSettingsStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads persisted branding settings', async () => {
    setActivePinia(createPinia());
    const gateway = applicationDependencies.brandSettingsGateway;

    vi.spyOn(gateway, 'get').mockResolvedValue(customBrand);
    const store = useBrandSettingsStore();

    await store.initialize();

    expect(store.softwareName).toBe('企业智能中枢');
    expect(store.iconUrl).toBe(customBrand.iconUrl);
    expect(store.errorMessage).toBe('');
  });

  it('validates a selected icon before updating the name', async () => {
    setActivePinia(createPinia());
    const gateway = applicationDependencies.brandSettingsGateway;
    const icon = new File([new Uint8Array([1])], 'logo.png', {
      type: 'image/png',
    });
    const updateName = vi
      .spyOn(gateway, 'updateName')
      .mockResolvedValue(customBrand);
    const uploadIcon = vi
      .spyOn(gateway, 'uploadIcon')
      .mockResolvedValue(customBrand);
    const removeIcon = vi.spyOn(gateway, 'removeIcon');
    const store = useBrandSettingsStore();

    await store.save({
      icon,
      removeIcon: false,
      softwareName: customBrand.softwareName,
    });

    expect(uploadIcon).toHaveBeenCalledWith(icon);
    expect(updateName).toHaveBeenCalledWith('企业智能中枢');
    expect(uploadIcon.mock.invocationCallOrder[0]!).toBeLessThan(
      updateName.mock.invocationCallOrder[0]!,
    );
    expect(removeIcon).not.toHaveBeenCalled();
    expect(store.settings).toEqual(customBrand);
  });
});
