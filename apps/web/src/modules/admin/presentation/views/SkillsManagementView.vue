<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import type { SkillSummary, SkillType } from '../../domain/admin-workspace';
import { useAdminWorkspaceStore } from '../../stores/admin-workspace.store';
import { formatDate } from '../admin-display';
import BaseIcon from '../components/BaseIcon.vue';
import BaseModal from '../components/BaseModal.vue';

const skillTypeLabels: Record<SkillType, string> = {
  mcp: 'MCP 工具',
  prompt: '提示词指令',
};

const workspaceStore = useAdminWorkspaceStore();
const formModalOpen = ref(false);
const editingSkillId = ref('');
const searchTerm = ref('');
const form = reactive({
  content: '',
  description: '',
  endpoint: '',
  headersText: '',
  name: '',
  type: 'prompt' as SkillType,
});

const isEditing = computed(() => editingSkillId.value !== '');
const filteredSkills = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();

  return query
    ? workspaceStore.skills.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query),
      )
    : workspaceStore.skills;
});

function parseHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const line of text.split('\n')) {
    const separator = line.indexOf(':');

    if (separator > 0) {
      headers[line.slice(0, separator).trim()] = line
        .slice(separator + 1)
        .trim();
    }
  }

  return headers;
}

function openInstallModal(): void {
  editingSkillId.value = '';
  form.name = '';
  form.description = '';
  form.type = 'prompt';
  form.content = '';
  form.endpoint = '';
  form.headersText = '';
  formModalOpen.value = true;
}

function openEditModal(skill: SkillSummary): void {
  editingSkillId.value = skill.id;
  form.name = skill.name;
  form.description = skill.description;
  form.type = skill.type;
  form.content = skill.content;
  form.endpoint = skill.endpoint;
  form.headersText = '';
  formModalOpen.value = true;
}

async function submitSkillForm(): Promise<void> {
  if (!form.name.trim()) {
    return;
  }

  if (form.type === 'prompt' && !form.content.trim()) {
    return;
  }

  if (form.type === 'mcp' && !form.endpoint.trim()) {
    return;
  }

  try {
    if (isEditing.value) {
      const existing = workspaceStore.skills.find(
        (skill) => skill.id === editingSkillId.value,
      );

      await workspaceStore.updateSkill(editingSkillId.value, {
        content: form.content.trim(),
        description: form.description.trim(),
        enabled: existing?.enabled ?? true,
        endpoint: form.endpoint.trim(),
        headers: form.headersText.trim()
          ? parseHeaders(form.headersText)
          : undefined,
        name: form.name.trim(),
      });
    } else {
      await workspaceStore.installSkill({
        content: form.content.trim(),
        description: form.description.trim(),
        endpoint: form.endpoint.trim(),
        headers: parseHeaders(form.headersText),
        name: form.name.trim(),
        type: form.type,
      });
    }

    formModalOpen.value = false;
  } catch {
    return;
  }
}

async function toggleSkill(skill: SkillSummary): Promise<void> {
  try {
    await workspaceStore.updateSkill(skill.id, {
      content: skill.content,
      description: skill.description,
      enabled: !skill.enabled,
      endpoint: skill.endpoint,
      name: skill.name,
    });
  } catch {
    return;
  }
}

async function removeSkill(skill: SkillSummary): Promise<void> {
  if (!window.confirm(`确定卸载技能“${skill.name}”吗？`)) {
    return;
  }

  try {
    await workspaceStore.deleteSkill(skill.id);
  } catch {
    return;
  }
}
</script>

<template>
  <div class="admin-page">
    <section class="page-toolbar">
      <label class="toolbar-search">
        <BaseIcon name="search" />
        <input v-model="searchTerm" type="search" placeholder="搜索技能名称…" />
      </label>
      <div class="page-toolbar__actions">
        <button class="primary-button" type="button" @click="openInstallModal">
          <BaseIcon name="plus" />
          安装技能
        </button>
      </div>
    </section>

    <section v-if="filteredSkills.length" class="agent-grid">
      <article
        v-for="skill in filteredSkills"
        :key="skill.id"
        class="resource-card agent-card"
      >
        <header class="resource-card__header">
          <span class="resource-avatar resource-avatar--large">
            <BaseIcon name="skill" />
          </span>
          <span
            class="status-badge"
            :class="
              skill.enabled
                ? 'status-badge--published'
                : 'status-badge--disabled'
            "
          >
            {{ skill.enabled ? '已启用' : '已停用' }}
          </span>
          <button
            class="text-button"
            type="button"
            :disabled="workspaceStore.isSaving"
            @click="toggleSkill(skill)"
          >
            {{ skill.enabled ? '停用' : '启用' }}
          </button>
        </header>
        <div class="resource-card__body">
          <h2>{{ skill.name }}</h2>
          <p>{{ skill.description || '暂无描述' }}</p>
          <dl class="agent-card__meta">
            <div>
              <dt>类型</dt>
              <dd>{{ skillTypeLabels[skill.type] }}</dd>
            </div>
            <div v-if="skill.type === 'mcp'">
              <dt>工具数量</dt>
              <dd>{{ skill.tools.length }} 个</dd>
            </div>
          </dl>
          <ul v-if="skill.tools.length" class="skill-tool-list">
            <li v-for="tool in skill.tools" :key="tool.name">
              <code>{{ tool.name }}</code>
              <span>{{ tool.description }}</span>
            </li>
          </ul>
        </div>
        <footer class="resource-card__footer">
          <span>更新于 {{ formatDate(skill.updatedAt) }}</span>
          <div class="resource-card__footer-actions">
            <button
              class="secondary-button secondary-button--small"
              type="button"
              :disabled="workspaceStore.isSaving"
              @click="openEditModal(skill)"
            >
              编辑
            </button>
            <button
              class="secondary-button secondary-button--small secondary-button--danger"
              type="button"
              :disabled="workspaceStore.isSaving"
              @click="removeSkill(skill)"
            >
              卸载
            </button>
          </div>
        </footer>
      </article>

      <button
        class="create-resource-card"
        type="button"
        @click="openInstallModal"
      >
        <span><BaseIcon name="plus" /></span>
        <strong>安装新的技能</strong>
        <small>添加提示词指令，或对接 MCP 服务扩展工具能力。</small>
      </button>
    </section>

    <section v-else-if="!workspaceStore.isLoading" class="empty-state">
      <BaseIcon name="skill" />
      <h2>还没有技能</h2>
      <p>安装提示词技能规范智能体行为，或对接 MCP 服务调用外部工具。</p>
      <button class="primary-button" type="button" @click="openInstallModal">
        安装第一个技能
      </button>
    </section>

    <BaseModal
      :open="formModalOpen"
      :title="isEditing ? '编辑技能' : '安装技能'"
      description="提示词技能注入系统提示；MCP 技能安装时连接服务并缓存工具清单。"
      @close="formModalOpen = false"
    >
      <form class="admin-form" @submit.prevent="submitSkillForm">
        <label>
          <span>技能名称</span>
          <input v-model="form.name" maxlength="80" required />
        </label>
        <label>
          <span>功能描述</span>
          <textarea
            v-model="form.description"
            rows="2"
            maxlength="240"
          ></textarea>
        </label>
        <label v-if="!isEditing">
          <span>技能类型</span>
          <select v-model="form.type">
            <option value="prompt">提示词指令</option>
            <option value="mcp">MCP 工具</option>
          </select>
        </label>
        <label v-if="form.type === 'prompt'">
          <span>指令内容</span>
          <textarea
            v-model="form.content"
            rows="6"
            maxlength="20000"
            required
          ></textarea>
        </label>
        <template v-else>
          <label>
            <span>MCP 服务地址（Streamable HTTP）</span>
            <input
              v-model="form.endpoint"
              type="url"
              maxlength="2000"
              required
              placeholder="https://example.com/mcp"
            />
          </label>
          <label>
            <span>请求头（可选，每行一条 key: value，用于鉴权）</span>
            <textarea
              v-model="form.headersText"
              rows="2"
              placeholder="Authorization: Bearer xxx"
            ></textarea>
            <small v-if="isEditing">留空则保留原有请求头。</small>
          </label>
        </template>
        <div class="form-actions">
          <button
            class="secondary-button"
            type="button"
            @click="formModalOpen = false"
          >
            取消
          </button>
          <button
            class="primary-button"
            type="submit"
            :disabled="workspaceStore.isSaving"
          >
            {{
              workspaceStore.isSaving
                ? '正在保存…'
                : isEditing
                  ? '保存修改'
                  : '安装技能'
            }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
