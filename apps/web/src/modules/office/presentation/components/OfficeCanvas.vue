<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import type { Agent, AgentState } from '@/modules/office/domain/office-agent';
import {
  OfficeScene,
  type OfficeAgentClick,
} from '@/modules/office/scene/OfficeScene';

type AgentMenuState = {
  agent: Agent;
  rosterNo: number;
  x: number;
  y: number;
  agents: Agent[];
  pickingTarget: boolean;
};

type InteractionTarget = {
  agent: Agent;
  rosterNo: number;
};

const STATE_ACTIONS: Array<{
  label: string;
  state: AgentState;
  task?: string;
}> = [
  { label: '开始工作', state: 'working', task: '处理当前任务…' },
  { label: '进入思考', state: 'thinking', task: '思考下一步…' },
  { label: '暂时空闲', state: 'idle' },
];

const STATE_LABELS: Record<AgentState, string> = {
  idle: '空闲',
  walking: '移动中',
  working: '工作中',
  talking: '互动中',
  thinking: '思考中',
};

const EMOTE_ACTIONS = [
  { label: '生气', animation: 'emotes/angry' },
  { label: '打嗝', animation: 'emotes/burp' },
  { label: '困惑', animation: 'emotes/confused' },
  { label: '哭泣', animation: 'emotes/crying' },
  { label: '倒下', animation: 'emotes/dead' },
  { label: '坚定', animation: 'emotes/determined' },
  { label: '凝视', animation: 'emotes/dramatic-stare' },
  { label: '兴奋', animation: 'emotes/excited' },
  { label: '撒娇', animation: 'emotes/fawning' },
  { label: '脸红', animation: 'emotes/flushed' },
  { label: '欢呼', animation: 'emotes/hooray' },
  { label: '灵感', animation: 'emotes/idea' },
  { label: '刚刚好', animation: 'emotes/just-right' },
  { label: '大笑', animation: 'emotes/laugh' },
  { label: '喜欢', animation: 'emotes/love' },
  { label: '害怕', animation: 'emotes/scared' },
  { label: '遮眼', animation: 'emotes/see-no-evil' },
  { label: '耸肩', animation: 'emotes/shrug' },
  { label: '闷闷不乐', animation: 'emotes/sulk' },
  { label: '冒汗', animation: 'emotes/sweat' },
  { label: '思考表情', animation: 'emotes/thinking' },
  { label: '吐舌', animation: 'emotes/tongue-out' },
  { label: '挥手', animation: 'emotes/wave' },
] as const;

const hostRef = ref<HTMLDivElement | null>(null);
const menu = ref<AgentMenuState | null>(null);
const loading = ref(true);
const errorMessage = ref('');

let scene: OfficeScene | null = null;
let resizeObserver: ResizeObserver | null = null;
let initialized = false;
let active = false;

function handleAgentClick(event: OfficeAgentClick): void {
  const host = hostRef.value;
  if (!host) return;

  const rect = host.getBoundingClientRect();
  const menuWidth = Math.min(260, rect.width - 24);
  const menuHeight = Math.min(520, rect.height - 24);
  menu.value = {
    agent: event.agent,
    rosterNo: event.rosterNo,
    x: Math.max(
      12,
      Math.min(event.clientX - rect.left, rect.width - menuWidth - 12),
    ),
    y: Math.max(
      12,
      Math.min(event.clientY - rect.top, rect.height - menuHeight - 12),
    ),
    agents: scene?.getAgents() ?? [],
    pickingTarget: false,
  };
}

function applyState(state: AgentState, task?: string): void {
  const current = menu.value;
  if (!current) return;
  scene?.setAgentState(current.agent.id, state, task);
  menu.value = null;
}

function playEmote(animation: string, label: string): void {
  const current = menu.value;
  if (!current) return;
  scene?.playAgentAnimation(current.agent.id, animation, label);
  menu.value = null;
}

function showInteractionTargets(): void {
  if (!menu.value) return;
  menu.value = { ...menu.value, pickingTarget: true };
}

function showActions(): void {
  if (!menu.value) return;
  menu.value = { ...menu.value, pickingTarget: false };
}

function interactionTargets(): InteractionTarget[] {
  const current = menu.value;
  if (!current) return [];

  return current.agents
    .map((agent, index) => ({ agent, rosterNo: index + 1 }))
    .filter(({ agent }) => agent.id !== current.agent.id);
}

function startInteraction(targetRosterNo: number, targetName: string): void {
  const current = menu.value;
  if (!current || targetRosterNo === current.rosterNo) return;

  scene?.requestDeskVisit(
    current.rosterNo,
    targetRosterNo,
    `${targetName}，我来和你同步一下。`,
  );
  menu.value = null;
}

function closeMenu(event: PointerEvent): void {
  const target = event.target;
  if (target instanceof Element && target.closest('.agent-action-menu')) {
    return;
  }
  menu.value = null;
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') menu.value = null;
}

function initializeScene(host: HTMLDivElement): void {
  const officeScene = new OfficeScene({ onAgentClick: handleAgentClick });
  scene = officeScene;

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;

    const { width, height } = entry.contentRect;
    if (width <= 0 || height <= 0) return;

    if (!initialized) {
      initialized = true;
      void officeScene
        .init(host, width, height)
        .then(() => {
          if (!active || scene !== officeScene) {
            officeScene.destroy();
            return;
          }
          loading.value = false;
        })
        .catch((error: unknown) => {
          console.error('[Office] 场景初始化失败', error);
          if (active) {
            loading.value = false;
            errorMessage.value = '办公室加载失败，请刷新页面重试。';
          }
        });
      return;
    }

    officeScene.resize(width, height);
  });
  resizeObserver.observe(host);
}

onMounted(() => {
  const host = hostRef.value;
  if (!host) return;

  active = true;
  initializeScene(host);
  document.addEventListener('pointerdown', closeMenu);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  active = false;
  resizeObserver?.disconnect();
  resizeObserver = null;
  document.removeEventListener('pointerdown', closeMenu);
  document.removeEventListener('keydown', handleKeydown);
  scene?.destroy();
  scene = null;
  initialized = false;
});
</script>

<template>
  <div ref="hostRef" class="office-canvas">
    <div v-if="loading" class="office-canvas__status" aria-live="polite">
      <span class="office-canvas__spinner"></span>
      <span>办公室加载中…</span>
    </div>
    <div
      v-else-if="errorMessage"
      class="office-canvas__status office-canvas__status--error"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="menu"
      class="agent-action-menu"
      :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
    >
      <div class="agent-action-head">
        <span class="agent-action-name">{{ menu.agent.name }}</span>
        <span class="agent-action-state">
          {{ STATE_LABELS[menu.agent.state] }}
        </span>
      </div>

      <template v-if="!menu.pickingTarget">
        <div class="agent-action-group">
          <div class="agent-action-section-title">互动</div>
          <button
            type="button"
            class="agent-action-btn"
            @click="showInteractionTargets"
          >
            选择互动对象
          </button>
        </div>

        <div class="agent-action-group">
          <div class="agent-action-section-title">状态</div>
          <button
            v-for="action in STATE_ACTIONS"
            :key="action.label"
            type="button"
            class="agent-action-btn"
            @click="applyState(action.state, action.task)"
          >
            {{ action.label }}
          </button>
        </div>

        <div class="agent-action-group">
          <div class="agent-action-section-title">表情动作</div>
          <div class="agent-emote-grid">
            <button
              v-for="action in EMOTE_ACTIONS"
              :key="action.animation"
              type="button"
              class="agent-action-chip"
              @click="playEmote(action.animation, action.label)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
      </template>

      <div v-else class="agent-action-group">
        <div class="agent-action-section-title">选择互动对象</div>
        <button
          type="button"
          class="agent-action-btn agent-action-btn--subtle"
          @click="showActions"
        >
          返回动作
        </button>
        <button
          v-for="target in interactionTargets()"
          :key="target.agent.id"
          type="button"
          class="agent-action-btn"
          @click="startInteraction(target.rosterNo, target.agent.name)"
        >
          和 {{ target.agent.name }} 互动
        </button>
      </div>
    </div>
  </div>
</template>
