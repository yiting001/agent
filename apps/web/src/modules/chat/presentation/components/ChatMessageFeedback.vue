<script setup lang="ts">
import { ref } from 'vue';

import type {
  GenerationFeedback,
  GenerationFeedbackReason,
} from '@/modules/admin/domain/admin-workspace';
import { useAdminWorkspaceStore } from '@/modules/admin/stores/admin-workspace.store';

const props = defineProps<{
  agentId: string;
  currentFeedback?: GenerationFeedback;
  generationId: string;
  memoryOwnerToken: string;
}>();
const emit = defineEmits<{
  saved: [feedback: GenerationFeedback];
}>();
const workspaceStore = useAdminWorkspaceStore();
const comment = ref('');
const errorMessage = ref('');
const expanded = ref(false);
const reasonCodes = ref<GenerationFeedbackReason[]>([]);
const submitting = ref(false);
const reasons: Array<{
  label: string;
  value: GenerationFeedbackReason;
}> = [
  { label: '事实错误', value: 'incorrect' },
  { label: '内容不相关', value: 'irrelevant' },
  { label: '引用错误', value: 'citation' },
  { label: '格式不符合', value: 'format' },
  { label: '模型或路由异常', value: 'model' },
  { label: '其他', value: 'other' },
];

async function submit(rating: GenerationFeedback['rating']): Promise<void> {
  if (submitting.value) {
    return;
  }

  if (rating === 'negative' && !expanded.value) {
    expanded.value = true;
    return;
  }

  submitting.value = true;
  errorMessage.value = '';

  try {
    const feedback = await workspaceStore.submitGenerationFeedback({
      agentId: props.agentId,
      comment: rating === 'negative' ? comment.value : undefined,
      generationId: props.generationId,
      memoryOwnerToken: props.memoryOwnerToken,
      rating,
      reasonCodes: rating === 'negative' ? reasonCodes.value : [],
    });

    expanded.value = false;
    emit('saved', feedback);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '反馈提交失败，请重试。';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="chat-feedback">
    <div class="chat-feedback__actions">
      <span>这条回答是否有帮助？</span>
      <button
        type="button"
        :class="{ 'is-active': currentFeedback?.rating === 'positive' }"
        :disabled="submitting"
        @click="submit('positive')"
      >
        有帮助
      </button>
      <button
        type="button"
        :class="{ 'is-active': currentFeedback?.rating === 'negative' }"
        :disabled="submitting"
        @click="submit('negative')"
      >
        需改进
      </button>
    </div>
    <div v-if="expanded" class="chat-feedback__form">
      <strong>请选择原因（可多选）</strong>
      <div>
        <label v-for="reason in reasons" :key="reason.value">
          <input v-model="reasonCodes" type="checkbox" :value="reason.value" />
          {{ reason.label }}
        </label>
      </div>
      <textarea
        v-model="comment"
        maxlength="1000"
        rows="3"
        placeholder="可选：补充说明具体问题"
      ></textarea>
      <button type="button" :disabled="submitting" @click="submit('negative')">
        {{ submitting ? '正在提交…' : '提交负向反馈' }}
      </button>
    </div>
    <small v-if="currentFeedback" class="chat-feedback__success">
      反馈已保存，可再次修改。
    </small>
    <small v-if="errorMessage" class="chat-feedback__error">
      {{ errorMessage }}
    </small>
  </div>
</template>
