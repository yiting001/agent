<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useBrandSettingsStore } from '@/modules/branding/stores/brand-settings.store';

import BaseIcon from '../components/BaseIcon.vue';

const SUPPORTED_ICON_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/vnd.microsoft.icon',
  'image/webp',
  'image/x-icon',
]);

const brandStore = useBrandSettingsStore();
const softwareName = ref('');
const selectedIcon = ref<File>();
const previewUrl = ref('');
const removeIcon = ref(false);
const validationMessage = ref('');
const saved = ref(false);

const displayedIconUrl = computed(() => {
  if (previewUrl.value) {
    return previewUrl.value;
  }

  return removeIcon.value ? undefined : brandStore.iconUrl;
});

function releasePreview(): void {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
}

function selectIcon(event: Event): void {
  const input = event.target;

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const icon = input.files?.[0];

  if (!icon) {
    return;
  }

  if (!SUPPORTED_ICON_TYPES.has(icon.type)) {
    validationMessage.value = '请选择 PNG、JPG、WebP 或 ICO 图片。';
    input.value = '';
    return;
  }

  releasePreview();
  selectedIcon.value = icon;
  previewUrl.value = URL.createObjectURL(icon);
  removeIcon.value = false;
  validationMessage.value = '';
  saved.value = false;
}

function useDefaultIcon(): void {
  releasePreview();
  selectedIcon.value = undefined;
  removeIcon.value = true;
  validationMessage.value = '';
  saved.value = false;
}

async function saveBrandSettings(): Promise<void> {
  const normalizedName = softwareName.value.trim();

  if (normalizedName.length < 2) {
    validationMessage.value = '软件名称至少需要两个字符。';
    return;
  }

  validationMessage.value = '';
  saved.value = false;

  try {
    await brandStore.save({
      icon: selectedIcon.value,
      removeIcon: removeIcon.value,
      softwareName: normalizedName,
    });
    softwareName.value = brandStore.softwareName;
    releasePreview();
    selectedIcon.value = undefined;
    removeIcon.value = false;
    saved.value = true;
  } catch {
    return;
  }
}

onMounted(async () => {
  await brandStore.initialize();
  softwareName.value = brandStore.softwareName;
});
onBeforeUnmount(releasePreview);
</script>

<template>
  <div class="admin-page brand-settings-page">
    <section class="brand-settings-intro">
      <div>
        <span class="section-kicker">全局品牌</span>
        <h2>让管理端和对话页使用统一的软件标识</h2>
        <p>名称和图标保存到后端，刷新页面或重新部署前端后仍然有效。</p>
      </div>
      <span class="brand-settings-intro__icon">
        <BaseIcon name="settings" />
      </span>
    </section>

    <div class="brand-settings-grid">
      <form
        class="panel-card brand-settings-form"
        @submit.prevent="saveBrandSettings"
      >
        <header class="panel-card__header">
          <div>
            <h2>软件信息</h2>
            <p>修改后同步应用到侧栏、浏览器标题和用户对话页面。</p>
          </div>
        </header>

        <div class="brand-settings-form__body">
          <label class="brand-settings-field">
            <span>软件名称</span>
            <input
              v-model="softwareName"
              maxlength="40"
              minlength="2"
              placeholder="请输入软件名称"
              required
              @input="saved = false"
            />
            <small>建议使用 2～20 个字符，最长不超过 40 个字符。</small>
          </label>

          <div class="brand-settings-field">
            <span>软件图标</span>
            <div class="brand-icon-editor">
              <span class="brand-icon-preview">
                <img
                  v-if="displayedIconUrl"
                  :src="displayedIconUrl"
                  alt="软件图标预览"
                />
                <BaseIcon v-else name="bot" />
              </span>
              <div>
                <label class="secondary-button brand-icon-upload">
                  <BaseIcon name="upload" />
                  选择图片
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.ico,image/png,image/jpeg,image/webp,image/x-icon"
                    @change="selectIcon"
                  />
                </label>
                <button
                  v-if="displayedIconUrl"
                  class="text-button"
                  type="button"
                  @click="useDefaultIcon"
                >
                  恢复默认图标
                </button>
                <small
                  >支持 PNG、JPG、WebP、ICO，大小上限由后端统一控制。</small
                >
              </div>
            </div>
          </div>

          <p
            v-if="validationMessage || brandStore.errorMessage"
            class="form-message form-message--error"
          >
            {{ validationMessage || brandStore.errorMessage }}
          </p>
          <p v-if="saved" class="form-message form-message--success">
            品牌配置已保存并立即生效。
          </p>

          <div class="brand-settings-actions">
            <button
              class="primary-button"
              type="submit"
              :disabled="brandStore.isSaving"
            >
              <BaseIcon name="check" />
              {{ brandStore.isSaving ? '正在保存…' : '保存品牌配置' }}
            </button>
          </div>
        </div>
      </form>

      <aside class="panel-card brand-preview-card">
        <header class="panel-card__header">
          <div>
            <h2>效果预览</h2>
            <p>模拟管理后台侧栏中的品牌展示。</p>
          </div>
        </header>
        <div class="brand-preview-card__body">
          <div class="brand-preview">
            <span class="brand-preview__mark">
              <img v-if="displayedIconUrl" :src="displayedIconUrl" alt="" />
              <BaseIcon v-else name="bot" />
            </span>
            <span>
              <strong>{{ softwareName.trim() || '软件名称' }}</strong>
              <small>管理控制台</small>
            </span>
          </div>
          <p>保存后所有打开的页面在下次加载配置时使用新名称和图标。</p>
        </div>
      </aside>
    </div>
  </div>
</template>
