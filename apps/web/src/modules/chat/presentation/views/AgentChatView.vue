<script setup lang="ts">
import { nextTick, ref } from 'vue';

import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

const initialMessage: ChatMessage = {
  content: '欢迎使用企业知识助手。请告诉我你想了解的问题，我会马上为你解答。',
  id: 'welcome',
  role: 'assistant',
};

const messages = ref<ChatMessage[]>([initialMessage]);
const message = ref('');
const replying = ref(false);
const conversation = ref<HTMLElement>();

const quickQuestions = [
  '请介绍一下你可以提供哪些帮助？',
  '请根据我的需求给出一份业务方案建议。',
];

function selectReply(question: string): string {
  if (question.includes('帮助') || question.includes('功能')) {
    return '我可以解答产品、服务、流程和常见问题，也能协助梳理需求并生成清晰的建议。';
  }

  if (question.includes('方案') || question.includes('需求')) {
    return '可以。请继续告诉我你的使用场景、主要用户和希望解决的问题，我会为你整理初步方案。';
  }

  return '已经收到你的问题。接入正式服务后，我会结合后台配置的知识资料生成更准确的回答。';
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

  if (!question || replying.value) {
    return;
  }

  messages.value.push({
    content: question,
    id: crypto.randomUUID(),
    role: 'user',
  });
  message.value = '';
  replying.value = true;
  await scrollToLatest();

  window.setTimeout(async () => {
    messages.value.push({
      content: selectReply(question),
      id: crypto.randomUUID(),
      role: 'assistant',
    });
    replying.value = false;
    await scrollToLatest();
  }, 650);
}

function resetConversation(): void {
  messages.value = [initialMessage];
  message.value = '';
  replying.value = false;
}
</script>

<template>
  <main class="vue-chat-page">
    <header class="vue-chat-header">
      <RouterLink class="vue-chat-back" to="/agents">
        <span>←</span>
        返回管理后台
      </RouterLink>
      <div class="vue-chat-identity">
        <span><BaseIcon name="bot" /><i></i></span>
        <div><strong>企业知识助手</strong><small>在线为你解答问题</small></div>
      </div>
      <button class="secondary-button" type="button" @click="resetConversation">
        重新开始
      </button>
    </header>

    <section ref="conversation" class="vue-chat-conversation">
      <div class="vue-chat-conversation__inner">
        <div v-if="messages.length === 1" class="vue-chat-welcome">
          <span><BaseIcon name="bot" /></span>
          <h1>你好，我是企业知识助手</h1>
          <p>直接提出问题，我会尽力提供清晰、准确的回答。</p>
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
              <small>{{ item.role === 'user' ? '我' : '企业知识助手' }}</small>
              <p>{{ item.content }}</p>
            </div>
          </article>
          <article v-if="replying" class="vue-chat-message">
            <span class="vue-chat-message__avatar"
              ><BaseIcon name="bot"
            /></span>
            <div>
              <small>企业知识助手</small>
              <p class="vue-chat-typing"><i></i><i></i><i></i></p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <footer class="vue-chat-composer-wrap">
      <form class="vue-chat-composer" @submit.prevent="sendMessage()">
        <textarea
          v-model="message"
          rows="1"
          maxlength="2000"
          placeholder="输入你的问题，按回车发送…"
          @keydown.enter.exact.prevent="sendMessage()"
        ></textarea>
        <button
          type="submit"
          :disabled="!message.trim() || replying"
          aria-label="发送消息"
        >
          <span>发送</span>
        </button>
      </form>
      <p>智能体生成的内容仅供参考，请核实重要信息。</p>
    </footer>
  </main>
</template>
