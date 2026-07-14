<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { webApplicationConfig } from '@/config/application.config';
import { createRandomId } from '@/shared/identity/random-id';
import type { ChatAttachmentSummary } from '@/modules/admin/domain/admin-workspace';
import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';
import { useAdminWorkspaceStore } from '@/modules/admin/stores/admin-workspace.store';
import { useBrandSettingsStore } from '@/modules/branding/stores/brand-settings.store';
import RichMessageContent from '../components/RichMessageContent.vue';

interface DisplayAttachment extends ChatAttachmentSummary {
  previewUrl: string;
}

interface ChatMessage {
  attachments?: DisplayAttachment[];
  content: string;
  id: string;
  role: 'assistant' | 'user';
  sources?: string[];
}

interface PendingAttachment {
  file: File;
  previewUrl: string;
}

const MAX_ATTACHMENTS = 6;
const MEMORY_OWNER_STORAGE_KEY = 'agent-memory-owner';
const SUPPORTED_ATTACHMENT_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function getMemoryOwnerKey(): string {
  try {
    const existing = window.localStorage.getItem(MEMORY_OWNER_STORAGE_KEY);

    if (existing) {
      return existing;
    }

    const ownerKey = createRandomId();
    window.localStorage.setItem(MEMORY_OWNER_STORAGE_KEY, ownerKey);

    return ownerKey;
  } catch {
    return createRandomId();
  }
}

const route = useRoute();
const workspaceStore = useAdminWorkspaceStore();
const brandStore = useBrandSettingsStore();
const messages = ref<ChatMessage[]>([]);
const message = ref('');
const replying = ref(false);
const errorMessage = ref('');
const pendingAttachments = ref<PendingAttachment[]>([]);
const conversation = ref<HTMLElement>();
const conversationId = ref(createRandomId());
const memoryOwnerKey = getMemoryOwnerKey();

const agentId = computed(() => {
  const routeAgentId = route.params.agentId;

  return typeof routeAgentId === 'string'
    ? routeAgentId
    : (workspaceStore.agents[0]?.id ?? '');
});
const agent = computed(() =>
  workspaceStore.agents.find((item) => item.id === agentId.value),
);
const quickQuestions = [
  '请介绍一下你可以提供哪些帮助？',
  '请根据知识库总结最重要的信息。',
];

function welcomeMessage(): ChatMessage {
  return {
    content: `你好，我是${agent.value?.name ?? '企业知识助手'}。请直接提出问题，我会结合已绑定的知识模块回答。`,
    id: 'welcome',
    role: 'assistant',
  };
}

async function scrollToLatest(): Promise<void> {
  await nextTick();
  conversation.value?.scrollTo({
    behavior: 'smooth',
    top: conversation.value.scrollHeight,
  });
}

async function sendMessage(content = message.value): Promise<void> {
  const question = content.trim();

  if (
    (!question && !pendingAttachments.value.length) ||
    replying.value ||
    !agentId.value
  ) {
    return;
  }

  errorMessage.value = '';
  replying.value = true;

  try {
    const pending = [...pendingAttachments.value];
    const uploaded = await Promise.all(
      pending.map((item) =>
        workspaceStore.uploadChatAttachment(
          agentId.value,
          memoryOwnerKey,
          item.file,
        ),
      ),
    );
    const attachments = uploaded.map(
      (attachment, index): DisplayAttachment => ({
        ...attachment,
        previewUrl: pending[index]?.previewUrl ?? '',
      }),
    );

    messages.value.push({
      attachments,
      content: question,
      id: createRandomId(),
      role: 'user',
    });
    pendingAttachments.value = [];
    message.value = '';
    await scrollToLatest();

    const history = messages.value
      .filter((item) => item.id !== 'welcome')
      .map((item) => ({
        attachments: item.attachments?.map(
          ({ fileName, id, mimeType, sizeBytes }) => ({
            fileName,
            id,
            mimeType,
            sizeBytes,
          }),
        ),
        content: item.content,
        role: item.role,
      }));
    const reply: ChatMessage = {
      content: '',
      id: createRandomId(),
      role: 'assistant',
    };

    messages.value.push(reply);
    const response = await workspaceStore.chat(
      agentId.value,
      conversationId.value,
      memoryOwnerKey,
      history,
      (delta) => {
        reply.content += delta;
        void scrollToLatest();
      },
    );

    reply.sources = [
      ...new Set(response.citations.map((item) => item.fileName)),
    ];
  } catch (error) {
    const lastMessage = messages.value.at(-1);

    if (lastMessage?.role === 'assistant' && !lastMessage.content) {
      messages.value.pop();
    }
    errorMessage.value =
      error instanceof Error ? error.message : '对话请求失败，请稍后重试。';
  } finally {
    replying.value = false;
    await scrollToLatest();
  }
}

function selectAttachments(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];

  for (const file of files) {
    if (pendingAttachments.value.length >= MAX_ATTACHMENTS) {
      errorMessage.value = `每次最多上传 ${MAX_ATTACHMENTS} 个附件。`;
      break;
    }

    if (!SUPPORTED_ATTACHMENT_TYPES.has(file.type)) {
      errorMessage.value = `${file.name} 的格式不受支持。`;
      continue;
    }

    if (file.size > webApplicationConfig.chatAttachmentMaxBytes) {
      const maxMegabytes = Math.floor(
        webApplicationConfig.chatAttachmentMaxBytes / 1024 / 1024,
      );

      errorMessage.value = `${file.name} 超过 ${maxMegabytes}MB。`;
      continue;
    }

    pendingAttachments.value.push({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  input.value = '';
}

function removePendingAttachment(index: number): void {
  const [attachment] = pendingAttachments.value.splice(index, 1);

  if (attachment) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
}

function resetConversation(): void {
  revokePreviewUrls();
  messages.value = [welcomeMessage()];
  conversationId.value = createRandomId();
  message.value = '';
  errorMessage.value = '';
  replying.value = false;
}

function revokePreviewUrls(): void {
  for (const attachment of pendingAttachments.value) {
    URL.revokeObjectURL(attachment.previewUrl);
  }

  for (const item of messages.value) {
    for (const attachment of item.attachments ?? []) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  }
}

onMounted(async () => {
  if (!workspaceStore.agents.length) {
    await workspaceStore.initialize();
  }

  resetConversation();
});

onBeforeUnmount(revokePreviewUrls);
</script>

<template>
  <main class="vue-chat-page">
    <header class="vue-chat-header">
      <div class="vue-chat-back-area">
        <RouterLink class="vue-chat-back" to="/agents">
          <BaseIcon name="back" />
          返回管理后台
        </RouterLink>
        <span class="vue-chat-product">
          <span>
            <img v-if="brandStore.iconUrl" :src="brandStore.iconUrl" alt="" />
            <BaseIcon v-else name="bot" />
          </span>
          {{ brandStore.softwareName }}
        </span>
      </div>
      <div class="vue-chat-identity">
        <span><BaseIcon name="bot" /><i></i></span>
        <div>
          <strong>{{ agent?.name ?? '智能体对话' }}</strong>
          <small>
            {{
              agent ? workspaceStore.providerName(agent.providerId) : '加载中'
            }}
          </small>
        </div>
      </div>
      <button class="secondary-button" type="button" @click="resetConversation">
        重新开始
      </button>
    </header>

    <section ref="conversation" class="vue-chat-conversation">
      <div class="vue-chat-conversation__inner">
        <div v-if="messages.length === 1" class="vue-chat-welcome">
          <span><BaseIcon name="bot" /></span>
          <h1>你好，我是{{ agent?.name ?? '企业知识助手' }}</h1>
          <p>{{ agent?.description ?? '正在加载智能体配置…' }}</p>
          <div>
            <button
              v-for="question in quickQuestions"
              :key="question"
              type="button"
              @click="sendMessage(question)"
            >
              <BaseIcon name="chat" />
              {{ question }}
            </button>
          </div>
        </div>

        <div class="vue-chat-messages">
          <article
            v-for="item in messages"
            :key="item.id"
            class="vue-chat-message"
            :class="`vue-chat-message--${item.role}`"
          >
            <span class="vue-chat-message__avatar">
              <BaseIcon :name="item.role === 'user' ? 'user' : 'bot'" />
            </span>
            <div>
              <small>{{ item.role === 'user' ? '我' : agent?.name }}</small>
              <div
                v-if="item.attachments?.length"
                class="chat-message-attachments"
              >
                <figure
                  v-for="attachment in item.attachments"
                  :key="attachment.id"
                >
                  <img
                    v-if="attachment.mimeType.startsWith('image/')"
                    :src="attachment.previewUrl"
                    :alt="attachment.fileName"
                  />
                  <audio
                    v-else
                    :src="attachment.previewUrl"
                    controls
                    preload="metadata"
                  ></audio>
                  <figcaption>{{ attachment.fileName }}</figcaption>
                </figure>
              </div>
              <RichMessageContent
                v-if="item.content && item.role === 'assistant'"
                :content="item.content"
                :streaming="replying && item.id === messages.at(-1)?.id"
              />
              <p v-else-if="item.content">{{ item.content }}</p>
              <p v-else class="vue-chat-typing"><i></i><i></i><i></i></p>
              <small v-if="item.sources?.length" class="chat-sources">
                参考资料：{{ item.sources.join('、') }}
              </small>
            </div>
          </article>
          <p v-if="errorMessage" class="chat-error">{{ errorMessage }}</p>
        </div>
      </div>
    </section>

    <footer class="vue-chat-composer-wrap">
      <form class="vue-chat-composer" @submit.prevent="sendMessage()">
        <div v-if="pendingAttachments.length" class="chat-pending-attachments">
          <figure
            v-for="(attachment, index) in pendingAttachments"
            :key="attachment.previewUrl"
          >
            <img
              v-if="attachment.file.type.startsWith('image/')"
              :src="attachment.previewUrl"
              :alt="attachment.file.name"
            />
            <span v-else><BaseIcon name="upload" /></span>
            <figcaption>{{ attachment.file.name }}</figcaption>
            <button
              type="button"
              aria-label="移除附件"
              @click="removePendingAttachment(index)"
            >
              <BaseIcon name="close" />
            </button>
          </figure>
        </div>
        <label class="chat-attachment-button" title="上传图片或音频">
          <BaseIcon name="upload" />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/wav"
            multiple
            :disabled="replying || !agent"
            @change="selectAttachments"
          />
        </label>
        <textarea
          v-model="message"
          rows="1"
          maxlength="8000"
          placeholder="输入你的问题，按回车发送…"
          :disabled="!agent"
          @keydown.enter.exact.prevent="sendMessage()"
        ></textarea>
        <button
          type="submit"
          :disabled="
            (!message.trim() && !pendingAttachments.length) ||
            replying ||
            !agent
          "
          aria-label="发送消息"
        >
          <span>发送</span>
        </button>
      </form>
      <p>支持 Markdown、LaTeX、图表、流程图及图片/音频输入，请核实重要信息。</p>
    </footer>
  </main>
</template>
