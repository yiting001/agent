<script setup lang="ts">
import { ref, watch } from 'vue';

import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';
import BaseModal from '@/modules/admin/presentation/components/BaseModal.vue';
import type { EvaluationSuiteSummary } from '@/modules/evaluation/domain/evaluation';

import type {
  ConvertFeedbackReviewInput,
  FeedbackReviewItem,
} from '../../domain/feedback-review';

const props = defineProps<{
  errorMessage: string;
  isLoading: boolean;
  isSaving: boolean;
  review?: FeedbackReviewItem;
  suites: EvaluationSuiteSummary[];
}>();

const emit = defineEmits<{
  cancel: [];
  retrySuites: [];
  submit: [input: ConvertFeedbackReviewInput];
}>();

const MAX_CRITERIA_CHARACTERS = 4_000;
const MAX_EXPECTED_OUTPUT_CHARACTERS = 20_000;
const MAX_INPUT_CHARACTERS = 4_000;
const MAX_KEYWORD_CHARACTERS = 80;
const MAX_KEYWORDS = 20;
const MAX_TAG_CHARACTERS = 40;
const MAX_TAGS = 20;

const evaluationCriteria = ref('');
const expectedKeywords = ref('');
const expectedOutput = ref('');
const input = ref('');
const suiteId = ref('');
const tags = ref('');
const validationMessage = ref('');

function splitValues(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[，,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function initialize(review?: FeedbackReviewItem): void {
  evaluationCriteria.value = '';
  expectedKeywords.value = '';
  expectedOutput.value = review?.expectedOutput ?? '';
  input.value = review?.input ?? '';
  suiteId.value = '';
  tags.value = review ? `feedback，${review.rating}` : '';
  validationMessage.value = '';
}

function submit(): void {
  const keywords = splitValues(expectedKeywords.value);

  if (!suiteId.value) {
    validationMessage.value = '请选择同一智能体的评估集。';
    return;
  }

  if (!input.value.trim()) {
    validationMessage.value = '请输入脱敏后的测试输入。';
    return;
  }

  if (!expectedOutput.value.trim()) {
    validationMessage.value = '请输入期望输出。';
    return;
  }

  if (!evaluationCriteria.value.trim()) {
    validationMessage.value = '请输入评价标准。';
    return;
  }

  if (!keywords.length) {
    validationMessage.value = '请至少填写一个期望关键词。';
    return;
  }

  if (
    keywords.length > MAX_KEYWORDS ||
    keywords.some((keyword) => keyword.length > MAX_KEYWORD_CHARACTERS)
  ) {
    validationMessage.value = `最多填写 ${MAX_KEYWORDS} 个关键词，每个不超过 ${MAX_KEYWORD_CHARACTERS} 个字符。`;
    return;
  }

  const normalizedTags = splitValues(tags.value);

  if (
    normalizedTags.length > MAX_TAGS ||
    normalizedTags.some((tag) => tag.length > MAX_TAG_CHARACTERS)
  ) {
    validationMessage.value = `最多填写 ${MAX_TAGS} 个标签，每个不超过 ${MAX_TAG_CHARACTERS} 个字符。`;
    return;
  }

  validationMessage.value = '';
  emit('submit', {
    evaluationCriteria: evaluationCriteria.value.trim(),
    expectedKeywords: keywords,
    expectedOutput: expectedOutput.value.trim(),
    input: input.value.trim(),
    suiteId: suiteId.value,
    tags: normalizedTags,
  });
}

watch(
  () => props.review?.feedbackId,
  () => initialize(props.review),
  { immediate: true },
);
</script>

<template>
  <BaseModal
    :description="
      review
        ? `Feedback ${review.feedbackId} · Agent ${review.agentId}`
        : '将人工确认的反馈转换为评估用例。'
    "
    :open="Boolean(review)"
    title="转换为 Evaluation case"
    wide
    @close="emit('cancel')"
  >
    <form
      v-if="review"
      class="feedback-conversion-form"
      @submit.prevent="submit"
    >
      <label>
        <span>目标评估集</span>
        <select v-model="suiteId" :disabled="isLoading || isSaving">
          <option value="">选择同一智能体的评估集</option>
          <option v-for="suite in suites" :key="suite.id" :value="suite.id">
            {{ suite.name }} · {{ suite.caseCount }} 个用例
          </option>
        </select>
      </label>

      <div v-if="isLoading" class="feedback-conversion-form__state">
        <BaseIcon name="activity" />
        正在读取评估集
      </div>
      <div
        v-else-if="!suites.length"
        class="feedback-conversion-form__state is-error"
      >
        <BaseIcon name="alert" />
        <span>{{ errorMessage || '该智能体还没有可用评估集。' }}</span>
        <button
          class="secondary-button secondary-button--small"
          type="button"
          @click="emit('retrySuites')"
        >
          重试
        </button>
      </div>

      <label>
        <span>脱敏输入</span>
        <textarea
          v-model="input"
          :disabled="isSaving"
          :maxlength="MAX_INPUT_CHARACTERS"
          rows="5"
        ></textarea>
      </label>
      <label>
        <span>期望输出</span>
        <textarea
          v-model="expectedOutput"
          :disabled="isSaving"
          :maxlength="MAX_EXPECTED_OUTPUT_CHARACTERS"
          rows="5"
        ></textarea>
      </label>
      <label>
        <span>评价标准</span>
        <textarea
          v-model="evaluationCriteria"
          :disabled="isSaving"
          :maxlength="MAX_CRITERIA_CHARACTERS"
          placeholder="说明可接受答案应满足的条件"
          rows="3"
        ></textarea>
      </label>
      <label>
        <span>期望关键词</span>
        <input
          v-model="expectedKeywords"
          :disabled="isSaving"
          placeholder="使用逗号或换行分隔"
          type="text"
        />
      </label>
      <label>
        <span>标签</span>
        <input
          v-model="tags"
          :disabled="isSaving"
          placeholder="使用逗号或换行分隔"
          type="text"
        />
      </label>

      <p
        v-if="validationMessage || errorMessage"
        class="form-error"
        role="alert"
      >
        {{ validationMessage || errorMessage }}
      </p>

      <footer class="feedback-conversion-form__actions">
        <button
          class="secondary-button"
          :disabled="isSaving"
          type="button"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          class="primary-button"
          :disabled="isLoading || isSaving || !suites.length"
          type="submit"
        >
          <BaseIcon name="check" />
          {{ isSaving ? '转换中…' : '确认转换' }}
        </button>
      </footer>
    </form>
  </BaseModal>
</template>
