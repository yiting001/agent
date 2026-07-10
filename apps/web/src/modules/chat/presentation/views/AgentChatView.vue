<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';
import { useAdminWorkspaceStore } from '@/modules/admin/stores/admin-workspace.store';
import { useBrandSettingsStore } from '@/modules/branding/stores/brand-settings.store';

interface ChatMessage {
  content: string;
  id: string;
  role: 'assistant' | 'user';
  sources?: string[];
}

const route = useRoute();
const workspaceStore = useAdminWorkspaceStore();
const brandStore = useBrandSettingsStore();
const messages = ref<ChatMessage[]>([]);
const message = ref('');
const replying = ref(false);
const errorMessage = ref('');
const conversation = ref<HTMLElement>();

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

  if (!question || replying.value || !agentId.value) {
    return;
  }

  messages.value.push({
    content: question,
    id: crypto.randomUUID(),
    role: 'user',
  });
  message.value = '';
  errorMessage.value = '';
  replying.value = true;
  await scrollToLatest();

  try {
    const response = await workspaceStore.chat(
      agentId.value,
      messages.value
        .filter((item) => item.id !== 'welcome')
        .map((item) => ({ content: item.content, role: item.role })),
    );

    messages.value.push({
      content: response.answer,
      id: crypto.randomUUID(),
      role: 'assistant',
      sources: [...new Set(response.citations.map((item) => item.fileName))],
    });
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '对话请求失败，请稍后重试。';
  } finally {
    replying.value = false;
    await scrollToLatest();
  }
}

function resetConversation(): void {
  messages.value = [welcomeMessage()];
  message.value = '';
  errorMessage.value = '';
  replying.value = false;
}

onMounted(async () => {
  if (!workspaceStore.agents.length) {
    await workspaceStore.initialize();
  }

  resetConversation();
});
</script>

<template>
  <main class="vue-chat-page">
    <header class="vue-chat-header">
      <div class="vue-chat-back-area">
        <RouterLink class="vue-chat-back" to="/agents">
          <span>←</span>
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
              <p>{{ item.content }}</p>
              <small v-if="item.sources?.length" class="chat-sources">
                参考资料：{{ item.sources.join('、') }}
              </small>
            </div>
          </article>
          <article v-if="replying" class="vue-chat-message">
            <span class="vue-chat-message__avatar"
              ><BaseIcon name="bot"
            /></span>
            <div>
              <small>{{ agent?.name }}</small>
              <p class="vue-chat-typing"><i></i><i></i><i></i></p>
            </div>
          </article>
          <p v-if="errorMessage" class="chat-error">{{ errorMessage }}</p>
        </div>
      </div>
    </section>

    <footer class="vue-chat-composer-wrap">
      <form class="vue-chat-composer" @submit.prevent="sendMessage()">
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
          :disabled="!message.trim() || replying || !agent"
          aria-label="发送消息"
        >
          <span>发送</span>
        </button>
      </form>
      <p>回答由真实模型结合已索引知识生成，请核实重要信息。</p>
    </footer>
  </main>
</template>
