<script setup lang="ts">
import { reactive } from 'vue';

import type { AgentSummary } from '@/modules/admin/domain/admin-workspace';
import BaseIcon from '@/modules/admin/presentation/components/BaseIcon.vue';

import type { CreateEvaluationSuiteInput } from '../../domain/evaluation';

interface EvaluationCaseForm {
  expectedKeywords: string;
  input: string;
}

const props = defineProps<{
  agents: AgentSummary[];
  isSaving: boolean;
}>();
const emit = defineEmits<{
  cancel: [];
  submit: [input: CreateEvaluationSuiteInput];
}>();
const form = reactive({
  agentId: props.agents[0]?.id ?? '',
  cases: [{ expectedKeywords: '', input: '' }] as EvaluationCaseForm[],
  description: '',
  name: '',
  passingThreshold: 0.8,
});

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function parseKeywords(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,，\n]/)
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  ];
}

function addCase(): void {
  form.cases.push({ expectedKeywords: '', input: '' });
}

function removeCase(index: number): void {
  if (form.cases.length > 1) {
    form.cases.splice(index, 1);
  }
}

function submit(): void {
  const cases = form.cases.map((evaluationCase) => ({
    expectedKeywords: parseKeywords(evaluationCase.expectedKeywords),
    input: evaluationCase.input.trim(),
  }));

  if (
    !form.agentId ||
    !form.name.trim() ||
    !form.description.trim() ||
    cases.some(
      (evaluationCase) =>
        !evaluationCase.input || evaluationCase.expectedKeywords.length === 0,
    )
  ) {
    return;
  }

  emit('submit', {
    agentId: form.agentId,
    cases,
    description: form.description.trim(),
    metrics: [
      {
        name: '关键词命中率',
        passingThreshold: form.passingThreshold,
        weight: 1,
      },
    ],
    name: form.name.trim(),
  });
}
</script>

<template>
  <form class="admin-form" @submit.prevent="submit">
    <label>
      <span>评估集名称</span>
      <input v-model="form.name" maxlength="80" required />
    </label>
    <label>
      <span>目标智能体</span>
      <select v-model="form.agentId" required>
        <option disabled value="">请选择智能体</option>
        <option v-for="agent in agents" :key="agent.id" :value="agent.id">
          {{ agent.name }}
        </option>
      </select>
    </label>
    <label>
      <span>功能说明</span>
      <textarea
        v-model="form.description"
        rows="3"
        maxlength="240"
        required
      ></textarea>
    </label>
    <label>
      <span>通过阈值：{{ formatPercent(form.passingThreshold) }}</span>
      <input
        v-model.number="form.passingThreshold"
        type="range"
        min="0"
        max="1"
        step="0.05"
      />
    </label>

    <fieldset
      v-for="(evaluationCase, index) in form.cases"
      :key="index"
      class="evaluation-case-form"
    >
      <legend>测试用例 {{ index + 1 }}</legend>
      <label>
        <span>用户输入</span>
        <textarea
          v-model="evaluationCase.input"
          rows="3"
          maxlength="4000"
          required
        ></textarea>
      </label>
      <label>
        <span>期望关键词</span>
        <input
          v-model="evaluationCase.expectedKeywords"
          placeholder="用逗号或换行分隔，例如：退款，时效，人工客服"
          required
        />
      </label>
      <button
        class="text-button"
        type="button"
        :disabled="form.cases.length === 1"
        @click="removeCase(index)"
      >
        删除此用例
      </button>
    </fieldset>

    <button class="secondary-button" type="button" @click="addCase">
      <BaseIcon name="plus" />
      添加用例
    </button>

    <div class="form-actions">
      <button class="secondary-button" type="button" @click="emit('cancel')">
        取消
      </button>
      <button class="primary-button" type="submit" :disabled="isSaving">
        {{ isSaving ? '正在保存…' : '保存评估集' }}
      </button>
    </div>
  </form>
</template>
