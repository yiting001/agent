# 架构说明

## 目标

项目使用低耦合、高内聚的模块化设计。抽象只服务于真实的替换点或业务边界，不以层数或设计模式数量作为质量目标。

## 后端依赖规则

```mermaid
flowchart RL
  Presentation[Presentation] --> Application[Application]
  Infrastructure[Infrastructure] --> Application
  Application --> Domain[Domain]
  Presentation -. 依赖注入 .-> Infrastructure
  Observability[Observability] -. 记录边界事件 .-> Presentation
  Observability -. 记录外部调用 .-> Infrastructure
  AgentMemory[Agent Memory] --> Application
```

- `domain`：业务概念、值对象和不变量，不依赖框架。
- `application`：用例、输入输出与外部能力端口。
- `infrastructure`：数据库、时钟和第三方服务等端口实现。
- `presentation`：HTTP 路由、DTO 和协议转换。

领域层与应用层不得导入 NestJS、TypeORM、Express 或前端代码。

`observability` 是横切基础设施，但仍通过应用服务暴露记录能力。业务模块只提交
操作名称、状态、耗时和用量，不依赖 PostgreSQL 实体，也不记录提示词、回复正文、
密钥或附件内容。

`agent-memory` 是对话应用能力，提供短期线程、稳定事实/偏好和图片情景记忆。
`AgentMemoryService` 管理短期与稳定事实，`AgentEpisodicMemoryService` 通过
PostgreSQL 任务/Outbox + 独立 pgvector 表 + ModelGateway 管理图片事件、混合召回与低置信度澄清。
`ChatAttachmentModule` 导出 owner 安全的附件端口，聊天和记忆共同复用，避免
把文件路径、TypeORM、pgvector 或多模态供应商细节泄漏到领域层。

## 商用基础设施边界

```mermaid
flowchart TB
  Presentation --> Application
  Application --> Ports[Repository / VectorIndex / RateLimiter Ports]
  PostgreSQL[PostgreSQL Adapter] --> Ports
  Pgvector[pgvector Adapter] --> Ports
  Redis[Redis Rate Limit Adapter] --> Ports
  Worker[进程内 Scheduler] --> Application
  Worker --> Queue[(PostgreSQL Tasks)]
```

- PostgreSQL 是业务事实、任务、Outbox 和观测数据的权威存储。
- pgvector 与知识库、情景记忆共享 PostgreSQL，但通过两个现有向量端口保持可替换。
- Redis 只用于 API/public chat 限流和短 TTL 协调，不保存权威数据。
- 当前单体继续使用 PostgreSQL 任务表；只有拆分独立 Worker 或出现多订阅者后才接入 RocketMQ。
- `/api/health` 是不访问依赖的 liveness；`/api/health/readiness` 检查 PostgreSQL、pgvector 和 Redis。
- workspace、成员、统一认证与 RLS 尚未实现，因此当前基础设施迁移不能视为完整 SaaS 租户安全。

完整选型、维度限制和消息系统触发条件见
[ADR-0003](decisions/0003-postgresql-pgvector-redis-and-message-boundary.md)。

## 前端模块规则

```mermaid
flowchart LR
  View[Presentation View] --> Store[Pinia Store]
  Store --> UseCase[Application Function]
  UseCase --> Port[Application Port]
  Adapter[Infrastructure Adapter] --> Port
  Adapter --> HTTP[Shared HTTP Client]
```

每个业务模块拥有自己的页面、组件、状态、应用函数和接口适配器。只有无业务语义且可跨模块复用的能力进入 `shared`。

## 配置管理

- 环境差异由 `.env` 提供。
- 后端通过 Nest Config 暴露类型化配置。
- 前端只通过 `import.meta.env` 的集中配置模块读取变量。
- 示例值只存在于 `.env.example` 和配置边界，不散落于业务代码。

## 设计评审清单

- 是否已有相同能力可以扩展？
- 是否存在跨层反向依赖？
- 是否能删掉一层而不损失边界？
- 类与函数是否只有一个变化原因？
- 错误是否在合适的层转换？
- 模块文档和图是否同步更新？
