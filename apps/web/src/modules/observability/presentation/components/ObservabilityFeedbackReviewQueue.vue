<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';

import type {
  FeedbackReasonCode,
  FeedbackReviewItem,
  FeedbackReviewQueueStatus,
} from '../../domain/feedback-review';
import { useObservabilityStore } from '../../stores/observability.store';
import { formatDateTime } from '../observability-display';

const props = defineProps<{
  canConvert: boolean;
}>();

const store = useObservabilityStore();
const reasons = reactive<Record<string, string>>({});
const queueStatus = ref<FeedbackReviewQueueStatus>('pending');
const loadedStatus = ref<FeedbackReviewQueueStatus>('pending');
const requestedPage = ref(1);
const hasCurrentPage = computed(() => loadedStatus.value === queueStatus.value);
const queueStatuses: Array<{
  label: string;
  value: FeedbackReviewQueueStatus;
}> = [
  { label: '待审核', value: 'pending' },
  { label: '已接受', value: 'accepted' },
];

const reasonLabels: Record<FeedbackReasonCode, string> = {
  citation: '引用错误',
  format: '格式不符合',
  incorrect: '事实错误',
  irrelevant: '内容不相关',
  model: '模型或路由异常',
  other: '其他',
};

function reviewReason(feedbackId: string): string {
  return reasons[feedbackId]?.trim() ?? '';
}

async function loadQueuePage(page = requestedPage.value): Promise<void> {
  requestedPage.value = page;
  await store.loadFeedbackReviews(queueStatus.value, page);

  if (!store.feedbackReviewErrorMessage) {
    loadedStatus.value = queueStatus.value;
  }
}

async function selectQueueStatus(
  status: FeedbackReviewQueueStatus,
): Promise<void> {
  if (status === queueStatus.value || store.isFeedbackReviewLoading) {
    return;
  }

  queueStatus.value = status;
  await loadQueuePage(1);
}

async function openConversion(review: FeedbackReviewItem): Promise<void> {
  if (props.canConvert) {
    await store.openFeedbackReviewConversion(review);
  }
}

async function decide(
  review: FeedbackReviewItem,
  decision: 'accepted' | 'rejected',
): Promise<void> {
  const updated = await store.decideFeedbackReview(review.feedbackId, {
    decision,
    expectedUpdatedAt: review.updatedAt,
    reason: reviewReason(review.feedbackId),
  });

  if (updated?.reviewStatus === 'accepted' && props.canConvert) {
    await store.openFeedbackReviewConversion(updated);
  }
}

async function retryDecision(): Promise<void> {
  const updated = await store.retryFeedbackReviewDecision();

  if (updated?.reviewStatus === 'accepted' && props.canConvert) {
    await store.openFeedbackReviewConversion(updated);
  }
}
</script>

<template>
  <section class="panel-card observability-feedback-review">
    <header class="panel-card__header">
      <div>
        <h2>负反馈审核</h2>
        <p v-if="canConvert">仅人工确认后的负反馈可转换为 Evaluation case。</p>
        <p v-else>当前凭证可审核反馈；转换还需评估管理权限。</p>
      </div>
      <div class="feedback-review-toolbar">
        <div
          class="observability-window feedback-review-tabs"
          aria-label="反馈审核状态"
          role="tablist"
        >
          <button
            v-for="status in queueStatuses"
            :key="status.value"
            :aria-selected="queueStatus === status.value"
            :class="{ 'is-active': queueStatus === status.value }"
            :disabled="store.isFeedbackReviewLoading"
            role="tab"
            type="button"
            @click="selectQueueStatus(status.value)"
          >
            {{ status.label }}
          </button>
        </div>
        <button
          class="secondary-button secondary-button--small"
          :disabled="store.isFeedbackReviewLoading"
          type="button"
          @click="loadQueuePage()"
        >
          <BaseIcon name="refresh" />
          {{ store.isFeedbackReviewLoading ? '加载中…' : '刷新' }}
        </button>
      </div>
    </header>

    <div
      v-if="store.conversionResult"
      class="observability-feedback-review__state is-success"
      role="status"
    >
      <BaseIcon name="check" />
      <span>
        {{
          store.conversionResult.alreadyConverted
            ? '该反馈已关联 Evaluation case。'
            : `已转换为 Evaluation case ${store.conversionResult.evaluationCaseId}。`
        }}
      </span>
    </div>

    <div
      v-if="store.feedbackReviewErrorMessage"
      class="observability-feedback-review__state is-error"
      role="alert"
    >
      <BaseIcon name="alert" />
      <span>{{ store.feedbackReviewErrorMessage }}</span>
      <button
        class="secondary-button secondary-button--small"
        type="button"
        @click="loadQueuePage()"
      >
        重试
      </button>
    </div>

    <div
      v-if="queueStatus === 'pending' && store.feedbackReviewActionError"
      class="observability-feedback-review__state is-error"
      role="alert"
    >
      <BaseIcon name="alert" />
      <span>{{ store.feedbackReviewActionError }}</span>
      <button
        v-if="store.canRetryFeedbackReviewDecision"
        class="secondary-button secondary-button--small"
        :disabled="Boolean(store.feedbackReviewActionId)"
        type="button"
        @click="retryDecision"
      >
        重试处置
      </button>
      <button
        v-else
        class="secondary-button secondary-button--small"
        type="button"
        @click="loadQueuePage()"
      >
        刷新队列
      </button>
    </div>

    <div
      v-if="
        store.isFeedbackReviewLoading &&
        (!hasCurrentPage || !store.feedbackReviewPage.items.length)
      "
      class="observability-feedback-review__state"
    >
      <BaseIcon name="activity" />
      <span>
        {{
          queueStatus === 'pending'
            ? '正在读取待审核反馈'
            : '正在读取已接受反馈'
        }}
      </span>
    </div>

    <div
      v-else-if="hasCurrentPage && store.feedbackReviewPage.items.length"
      class="review-list"
    >
      <article
        v-for="review in store.feedbackReviewPage.items"
        :key="review.feedbackId"
        class="review-item"
      >
        <header class="review-item__header">
          <div>
            <span
              class="status-badge"
              :class="
                queueStatus === 'pending'
                  ? 'status-badge--error'
                  : 'status-badge--ok'
              "
            >
              {{ queueStatus === 'pending' ? '待审核' : '已接受' }}
            </span>
            <strong>{{ review.agentId }}</strong>
          </div>
          <time>{{ formatDateTime(review.updatedAt) }}</time>
        </header>

        <div class="review-item__metadata">
          <span>Feedback {{ review.feedbackId }}</span>
          <span>Generation {{ review.generationId }}</span>
          <span v-if="review.truncated">正文已截断</span>
        </div>

        <div v-if="review.reasonCodes.length" class="review-item__reasons">
          <span v-for="reason in review.reasonCodes" :key="reason">
            {{ reasonLabels[reason] }}
          </span>
        </div>

        <p v-if="review.comment" class="review-item__comment">
          {{ review.comment }}
        </p>

        <div class="review-item__content">
          <section>
            <h3>脱敏输入</h3>
            <pre>{{ review.input || '（无保留输入）' }}</pre>
          </section>
          <section>
            <h3>建议期望输出</h3>
            <pre>{{ review.expectedOutput || '（尚未填写）' }}</pre>
          </section>
        </div>

        <label
          v-if="queueStatus === 'pending'"
          class="review-item__reason-field"
        >
          <span>审核理由</span>
          <textarea
            v-model="reasons[review.feedbackId]"
            maxlength="1000"
            placeholder="说明接受或拒绝的依据"
            rows="2"
          ></textarea>
        </label>

        <footer v-if="queueStatus === 'pending'" class="review-item__actions">
          <button
            class="secondary-button secondary-button--small"
            :disabled="
              Boolean(store.feedbackReviewActionId) ||
              !reviewReason(review.feedbackId)
            "
            type="button"
            @click="decide(review, 'rejected')"
          >
            拒绝
          </button>
          <button
            class="primary-button primary-button--small"
            :disabled="
              Boolean(store.feedbackReviewActionId) ||
              !reviewReason(review.feedbackId)
            "
            type="button"
            @click="decide(review, 'accepted')"
          >
            <BaseIcon name="check" />
            {{
              store.feedbackReviewActionId === review.feedbackId
                ? '处理中…'
                : canConvert
                  ? '接受并转换'
                  : '接受'
            }}
          </button>
        </footer>
        <footer v-else class="review-item__actions">
          <button
            v-if="canConvert"
            class="primary-button primary-button--small"
            :disabled="store.isPreparingConversion"
            type="button"
            @click="openConversion(review)"
          >
            <BaseIcon name="check" />
            {{ store.isPreparingConversion ? '加载中…' : '转换' }}
          </button>
          <span v-else class="review-item__permission">
            只读：转换需评估管理权限
          </span>
        </footer>
      </article>
    </div>

    <div
      v-else-if="
        hasCurrentPage &&
        !store.isFeedbackReviewLoading &&
        !store.feedbackReviewErrorMessage
      "
      class="observability-feedback-review__state"
    >
      <BaseIcon name="check" />
      <span>
        {{
          queueStatus === 'pending'
            ? '当前没有待审核的负反馈。'
            : '当前没有已接受、待转换的负反馈。'
        }}
      </span>
    </div>

    <footer
      v-if="store.feedbackReviewPage.totalPages > 1"
      class="observability-review-pagination"
    >
      <button
        class="icon-button"
        aria-label="上一页审核反馈"
        :disabled="
          store.isFeedbackReviewLoading || store.feedbackReviewPage.page <= 1
        "
        type="button"
        @click="loadQueuePage(store.feedbackReviewPage.page - 1)"
      >
        <BaseIcon class="observability-pagination__previous" name="chevron" />
      </button>
      <span>
        第 {{ store.feedbackReviewPage.page }} /
        {{ store.feedbackReviewPage.totalPages }} 页
      </span>
      <button
        class="icon-button"
        aria-label="下一页审核反馈"
        :disabled="
          store.isFeedbackReviewLoading ||
          store.feedbackReviewPage.page >= store.feedbackReviewPage.totalPages
        "
        type="button"
        @click="loadQueuePage(store.feedbackReviewPage.page + 1)"
      >
        <BaseIcon name="chevron" />
      </button>
    </footer>
  </section>
</template>
