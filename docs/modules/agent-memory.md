# 智能体记忆系统

## 模块目标

智能体记忆系统让同一个智能体在多轮和跨会话中保持上下文连续性：

- **短期记忆**：按 `memoryOwnerKey + conversationId` 持久化最近对话轮次，下一次请求可以只提交最新问题，服务端会恢复该会话最近消息。
- **长期记忆**：从用户显式要求“记住”的内容、姓名和偏好中提取稳定事实，跨会话召回并注入系统上下文。
- **图片情景记忆**：成功对话中的 owner 绑定图片会异步提取客观摘要和实体，保存原图引用，并支持“上次那只狗”“前一张图片”等跨会话指代。
- **独立混合检索**：情景记忆使用独立 pgvector 维度表和过滤字段，并结合向量、实体词、时间顺序、新近性和重要度重排，不与企业知识库索引混用。
- **证据回读**：问题依赖颜色、数量、品种或 OCR 等视觉细节时，重新读取 owner 范围内原始图片交给多模态模型，而不是只依赖 caption。
- **可观测边界**：不写入密钥、base64、模型完整提示词或未经确认的对象归属；视觉提取失败时保留 `pending` 情景，不生成虚假描述。
- **兼容现有入口**：后台测试页、公开 EyouCMS 页面和 OpenAI 兼容 API 继续复用 `ChatWithAgentUseCase`。

非目标：

- 不替代知识库 RAG。知识库面向企业文档，记忆面向对话中形成的用户/智能体上下文。
- 不把所有历史消息无限塞入模型上下文，只保留可配置最近轮次并按相关性召回长期记忆。
- 第一阶段不引入图数据库或训练专用记忆模型；实体关系先通过 PostgreSQL 情景文本、附件关系和检索实体表达。

## 大厂实践参考

- LangGraph 将记忆分为 **thread-scoped short-term memory** 和跨线程的 **long-term store**：短期用 checkpointer 恢复线程状态，长期用 namespace store 检索事实。
- Google ADK 区分 `Session`、`State`、`MemoryService`：会话保存事件和临时状态，MemoryService 负责把完成会话或增量事件写入可搜索长期记忆。
- OpenAI Agents SDK 的 Sessions 在每次运行前读取历史、运行后写回新增项，并支持限制读取条数来控制上下文成本。
- Claude Memory Tool 把持久记忆交给应用侧存储，只在需要时读取，避免把所有历史都常驻上下文。
- Microsoft AutoGen 抽象 `Memory` 协议，核心能力是 `add`、`query`、`update_context`、`clear`。
- Letta 区分 always-visible memory blocks、可检索 archival memory 和外部 RAG；小而关键的偏好适合长期记忆，大文档仍交给知识库。

本项目采用三层结构：会话线程负责短期连续性，稳定事实仓库负责跨会话偏好，图片情景层负责带时间和原始媒体证据的事件回忆。

## 目录结构

```text
apps/api/src/modules/agent-memory/
├── agent-memory.module.ts
├── domain/
│   ├── agent-memory-task.ts
│   └── agent-memory.ts
├── application/
│   ├── agent-episodic-memory.service.ts
│   ├── agent-memory-management.service.ts
│   ├── agent-memory-maintenance.service.ts
│   ├── agent-memory.index.ts
│   ├── agent-memory.repository.ts
│   ├── agent-memory.service.ts
│   ├── agent-memory-task.repository.ts
│   ├── episode-extraction.ts
│   ├── episodic-memory-query.ts
│   └── process-next-agent-memory-task.use-case.ts
├── infrastructure/
│   ├── agent-memory-artifact.entity.ts
│   ├── agent-memory.entity.ts
│   ├── agent-memory-message.entity.ts
│   ├── agent-memory-task.entity.ts
│   ├── agent-memory-task.scheduler.ts
│   ├── agent-memory-thread.entity.ts
│   ├── typeorm-agent-memory.repository.ts
│   ├── typeorm-agent-memory-task-maintenance.store.ts
│   ├── typeorm-agent-memory-task.repository.ts
│   └── pgvector-agent-memory.index.ts
└── presentation/http/
    ├── clear-agent-memory.controller.ts
    ├── delete-agent-memory.controller.ts
    ├── get-agent-memory-artifact.controller.ts
    ├── get-agent-memory-health.controller.ts
    ├── list-agent-memories.controller.ts
    ├── list-agent-memory-tasks.controller.ts
    ├── recover-agent-memory-tasks.controller.ts
    ├── retry-agent-memory.controller.ts
    └── memory-owner-key.ts
```

## 数据流

```mermaid
sequenceDiagram
  participant UI as Web / Eyou / API
  participant Chat as ChatWithAgentUseCase
  participant Stable as AgentMemoryService
  participant Episode as AgentEpisodicMemoryService
  participant DB as PostgreSQL
  participant Index as Memory pgvector
  participant Media as ChatAttachmentStorage
  participant Model as ModelGateway

  UI->>Chat: messages + conversationId + memoryOwnerKey
  Chat->>Stable: 恢复短期消息与稳定事实
  Chat->>Episode: 混合召回图片情景
  Episode->>DB: owner + agent 范围候选
  Episode->>Index: 向量候选
  Episode-->>Chat: 情景摘要 + 必要的图片引用
  Chat->>Media: owner 范围回读原图证据
  Chat->>Model: system + memory + evidence + messages
  Model-->>Chat: 流式回答
  Chat-->>UI: delta
  Chat->>Stable: 写入成功轮次与显式长期记忆
  Chat->>Episode: 短事务投递图片情景
  Episode->>DB: 同事务写 pending 情景、artifact、extract Outbox 任务
  DB-->>Chat: 投递完成并唤醒应用层调度端口
  Chat-->>UI: metadata / done
  loop PostgreSQL scheduler
    Episode->>DB: 条件 UPDATE 领取单个任务
    Episode->>Media: owner 范围读取原图
    Episode->>Model: 客观摘要与实体 JSON
    Episode->>DB: ready + index 任务
    Episode->>Model: 摘要 embedding
    Episode->>DB: 持久化 embedding 结果
    Episode->>Index: 以 memoryId 幂等 upsert
    Episode->>DB: succeeded + indexedAt
  end
```

## 存储模型

```mermaid
erDiagram
  agent_memory_threads ||--o{ agent_memory_messages : contains
  agent_memories ||--o{ agent_memory_artifacts : evidence
  agent_memories ||--o{ agent_memory_tasks : outbox

  agent_memory_threads {
    text id
    text agentId
    text ownerKey
    text source
    text title
    timestamptz createdAt
    timestamptz updatedAt
  }

  agent_memory_messages {
    text id
    text threadId
    text ownerKey
    text role
    text content
    integer position
    timestamptz createdAt
  }

  agent_memories {
    text id
    text agentId
    text ownerKey
    text type
    text content
    text sourceThreadId
    text status
    text idempotencyKey
    timestamptz indexedAt
    integer importance
    integer accessCount
    timestamptz lastAccessedAt
    timestamptz createdAt
    timestamptz updatedAt
  }

  agent_memory_artifacts {
    text id
    text memoryId
    text agentId
    text ownerKey
    text attachmentId
    text fileName
    text mimeType
    integer sizeBytes
    timestamptz createdAt
  }

  agent_memory_tasks {
    text id
    text memoryId
    text agentId
    text ownerKey
    text kind
    text status
    integer attempts
    integer maxAttempts
    timestamptz nextRunAt
    timestamptz lockedAt
    text lockOwner
    text lastError
    text embeddingJson
    integer embeddingDimensions
    timestamptz completedAt
  }
```

`agent_memories.type=episodic` 表示图片情景；`pending` 表示证据已保存但尚未完成提取，`ready` 表示客观摘要已提取，`failed` 表示 extract 达到最大尝试次数或证据损坏。`indexedAt` 非空表示当前摘要已写入 pgvector。`agent_memory_tasks` 同时承担 PostgreSQL 队列和事务 Outbox，不保存 base64、完整提示词、密钥或内部媒体路径；embedding 仅保存在 index 任务中，用于 pgvector 故障重试时避免重复调用模型。

## 任务状态机与并发边界

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> processing: 条件 UPDATE claim / attempts + 1
  processing --> succeeded: 阶段完成
  processing --> queued: 可重试失败 + 指数退避
  processing --> dead: attempts >= maxAttempts
  dead --> queued: owner 范围手动 retry / recover
  processing --> queued: lease 超时回收
```

- 情景幂等键为 `sha256(agentId | ownerKey | conversationId | 排序后的 attachmentIds | sha256(userContent))`；唯一索引限制同一 owner/agent 的重复情景。
- `(memoryId, kind)` 唯一索引保证 `extract`、`index` 各只有一个任务。
- claim 使用单条条件 `UPDATE`；每次领取生成独立 `lockOwner`，同一任务不能被两个执行器同时成功领取。
- PostgreSQL 事务只执行短数据库操作。图片读取、模型请求、embedding 和 pgvector upsert 全部在事务外执行。
- index 任务先持久化 embedding，再以 `memoryId` upsert pgvector；pgvector 失败后复用已保存向量。
- 模型已返回 embedding、PostgreSQL 尚未保存时若进程崩溃，下一次仍可能重复调用一次 embedding；这是当前无法用本地事务覆盖外部模型调用的窄窗口。
- 错误摘要会移除 data URI、base64 和 Bearer token，并截断到 500 字符。
- 服务启动后立即回收超时 lease；定时扫描超时 `pending`、缺失任务、缺失 pgvector 点、悬空 artifact 和超时无引用图片。
- 当前 `AgentMemoryIndex` 端口只暴露按 memoryId 正向检查，尚未暴露全量 ID 分页枚举；因此完整反向孤儿清理仍属于后续路线。

## 公共接口

### 对话请求

三个对话入口都支持可选 `conversationId`：

- `POST /api/agents/:id/chat`
- `POST /api/public/agents/:agentId/chat`
- `POST /api/v1/chat/completions`

示例：

```json
{
  "conversationId": "9fb4a3f7-91b7-46de-92a2-55d932f7a74f",
  "memoryOwnerKey": "225f42d8-ea54-46fc-a59f-a702ea0f0509",
  "messages": [{ "role": "user", "content": "请记住：我喜欢中文回答" }],
  "stream": true
}
```

### 长期记忆列表

```text
GET /api/agents/:agentId/memories?ownerKey=<memoryOwnerKey>
```

返回稳定记忆和图片情景摘要。图片情景包含 `status` 与 `artifacts` 元数据，可用于诊断、查看和删除。

### 查看情景原始图片

```text
GET /api/agents/:agentId/memories/:memoryId/artifacts/:artifactId?ownerKey=<memoryOwnerKey>
```

接口同时校验 `agentId + ownerKey + memoryId + artifactId`，只返回该 owner 的原始图片。上传时 Vue 和 EyouCMS 会通过 `X-Agent-Id`、`X-Memory-Owner-Key` 将附件绑定到智能体和 owner；旧的无状态附件仍可用于当前对话，但不会形成长期图片情景。

记忆始终按 `agentId + memoryOwnerKey` 隔离。后台测试页和 EyouCMS 页面在浏览器首次访问时生成随机 owner key；OpenAI 兼容接口使用 API 应用 ID 作为 owner key。未提供 owner key 的旧调用保持无状态，不读取或写入长期记忆。

### 删除和清空

```text
DELETE /api/agents/:agentId/memories/:memoryId?ownerKey=<memoryOwnerKey>
DELETE /api/agents/:agentId/memories?ownerKey=<memoryOwnerKey>
```

第一条删除指定记忆及其 pgvector 点和无引用图片；第二条清空该 owner 在指定智能体下的短期线程、短期消息、长期记忆、图片关系、向量和无引用媒体。

### 任务管理与健康检查

```text
GET  /api/agents/:agentId/memory-tasks?ownerKey=<key>&status=queued|processing|succeeded|dead
POST /api/agents/:agentId/memories/:memoryId/retry?ownerKey=<key>
POST /api/agents/:agentId/memory-tasks/recover?ownerKey=<key>
GET  /api/agents/:agentId/memory-health?ownerKey=<key>
```

所有接口同时按 `agentId + ownerKey` 过滤。单条 retry 和批量 recover 只重置该范围内的 dead 任务；health 会执行安全巡检并补建缺失任务、重建缺失索引、将缺失原始媒体的情景标为 failed，并删除超过 pending 超时且无 artifact 引用的 owner 绑定图片。当前阶段只提供服务端运维接口，不新增 Vue 管理页。

## 记忆写入规则

长期记忆只在高置信场景写入：

- `请记住：...`
- `remember that ...`
- `我叫...`、`我的名字是...`
- `我喜欢...`、`我偏好...`
- `我不喜欢...`、`我希望你...`

疑问句不会按普通偏好规则写入；显式“记住”内容若同时符合姓名或偏好规则，只保存结构化后的单条记忆。相同 `agentId + ownerKey` 下相同内容去重，重复出现只更新重要度和更新时间。短期记忆只写入最新用户消息与成功回答，失败或中断的流不会增加对话计数，也不会写入记忆。

图片情景遵循不同规则：

1. 只有成功完成的回答、有效 owner 和 owner 绑定图片才进入记录流程。
2. 模型回答成功生成后，以短事务写 PostgreSQL Outbox，再通过应用层调度端口唤醒后台任务；投递失败会记录脱敏告警但不改变回答结果，模型提取和索引不会阻塞聊天。
3. 多模态模型只输出客观摘要、可检索实体和重要度，不允许推断“图片里的狗属于用户”等归属。
4. 创建时先保存“待处理图片情景”及原始证据；只有模型返回合法客观 JSON 后才写入 `ready` 摘要。失败时保留 `pending`，耗尽重试后进入 `failed`，不写入虚假视觉描述。
5. 召回按向量、实体词、时间指代、新近性和重要度重排；低于阈值不注入，多个候选接近时要求模型先澄清。
6. “前一只/前一张”跳过最近候选；“最近/上次”优先最近事件。
7. 视觉细节问题回读原图；只询问事件大意时使用摘要，减少多模态成本。

## 配置项

| 环境变量                             | 默认值   | 说明                       |
| ------------------------------------ | -------- | -------------------------- |
| `AGENT_MEMORY_RECENT_MESSAGE_LIMIT`  | `12`     | 每个会话恢复的最近消息条数 |
| `AGENT_MEMORY_RECALL_LIMIT`          | `6`      | 每次注入模型的稳定记忆条数 |
| `AGENT_MEMORY_EPISODE_RECALL_LIMIT`  | `3`      | 每次最多注入的图片情景数   |
| `AGENT_MEMORY_EPISODE_MIN_SCORE`     | `0.25`   | 情景召回最低混合分数       |
| `AGENT_MEMORY_TASK_POLL_INTERVAL_MS` | `2000`   | PostgreSQL 队列轮询间隔    |
| `AGENT_MEMORY_TASK_MAX_ATTEMPTS`     | `3`      | 单阶段最大尝试次数         |
| `AGENT_MEMORY_TASK_BACKOFF_BASE_MS`  | `1000`   | 指数退避基础时长           |
| `AGENT_MEMORY_TASK_LOCK_TIMEOUT_MS`  | `60000`  | processing lease 超时      |
| `AGENT_MEMORY_PENDING_TIMEOUT_MS`    | `300000` | pending/无引用媒体巡检阈值 |
| `AGENT_MEMORY_RECONCILE_INTERVAL_MS` | `60000`  | 一致性巡检间隔             |

## 日志、指标、成本与告警

- 视觉提取、embedding 和召回继续使用 `ModelCallObserver`，操作名为 `memory.episode_extract`、`memory.episode_embed`、`memory.episode_recall`，并附带 `domain=agent-memory` 与阶段 metadata。
- 任务成功、任务失败和一致性修复分别记录 `agent_memory.task_succeeded`、`agent_memory.task_failure`、`agent_memory.consistency_repair`；失败事件复用 Observability critical 告警。
- Token、模型成本、模型耗时、慢调用和单次高成本告警复用现有 Observability 仪表盘与阈值。
- `memory-health` 暴露队列积压、dead、pending、ready 未索引、悬空 artifact、缺失索引和孤立媒体计数。
- 日志和 metadata 不记录 ownerKey、base64、完整用户内容、完整提示词、密钥或本地文件路径。

## 测试范围

- 单元测试覆盖短期历史重叠、稳定记忆抽取、中文实体词、最近/前一情景排序和候选歧义判断。
- 任务领域测试覆盖幂等键、指数退避上限和错误脱敏。
- E2E 覆盖图片上传、自动提取、`pending` 降级、并发幂等、模型失败重试至 dead、owner/agent 隔离、单条 retry、lease 回收、embedding 复用、pgvector 失败恢复和缺失索引巡检。
- PostgreSQL/pgvector 集成测试覆盖真实 upsert、cosine search、删除及 owner/agent 过滤；任务并发领取使用 `FOR UPDATE SKIP LOCKED`。
- migration E2E 验证任务表、幂等列和索引时间列的 up/down。
- 对话入口保持向后兼容；不传 `conversationId` 时仍按原来的请求消息工作。
- 未提供 `memoryOwnerKey` 的调用保持无状态，不自动记录图片情景。

## 扩展方式

- 若需要后台人工维护，可复用任务列表、retry、recover 和 health 接口增加 Vue/Pinia 管理页。
- 后续优先补充保留期、反向 pgvector 孤儿枚举、专项仪表盘和预算告警，再评估实体图谱和跨模态专用 embedding。
- 当前 ownerKey 仍不是 workspace/tenant 身份；商用多租户上线前必须完成统一认证、资源 workspace 外键和 PostgreSQL RLS。
- 完整的未实现项、优先级和推荐实施顺序见
  [图片情景记忆后续路线](agent-memory-roadmap.md)。
