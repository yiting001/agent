import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { applicationDependencies } from '@/app/dependencies';

import type {
  BrandSettings,
  SaveBrandSettingsInput,
} from '../domain/brand-settings';

const gateway = applicationDependencies.brandSettingsGateway;
const INITIAL_BRAND_SETTINGS: BrandSettings = {
  hasCustomIcon: false,
  softwareName: '智能体平台',
  updatedAt: new Date(0).toISOString(),
};

export const useBrandSettingsStore = defineStore('brand-settings', () => {
  const settings = ref<BrandSettings>(INITIAL_BRAND_SETTINGS);
  const errorMessage = ref('');
  const isLoading = ref(false);
  const isSaving = ref(false);
  const initialized = ref(false);
  let initialization: Promise<void> | undefined;

  const iconUrl = computed(() => settings.value.iconUrl);
  const softwareName = computed(() => settings.value.softwareName);

  function initialize(): Promise<void> {
    if (initialized.value) {
      return Promise.resolve();
    }

    if (!initialization) {
      initialization = load();
    }

    return initialization;
  }

  async function save(input: SaveBrandSettingsInput): Promise<void> {
    errorMessage.value = '';
    isSaving.value = true;

    try {
      if (input.icon) {
        settings.value = await gateway.uploadIcon(input.icon);
      } else if (input.removeIcon) {
        settings.value = await gateway.removeIcon();
      }

      settings.value = await gateway.updateName(input.softwareName);
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '品牌配置保存失败。';
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  async function load(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      settings.value = await gateway.get();
      initialized.value = true;
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '品牌配置加载失败。';
    } finally {
      isLoading.value = false;
      initialization = undefined;
    }
  }

  return {
    errorMessage,
    iconUrl,
    initialize,
    isLoading,
    isSaving,
    save,
    settings,
    softwareName,
  };
});
