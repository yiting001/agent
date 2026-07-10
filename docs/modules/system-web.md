# Web 系统状态模块

## 目标

读取 API 健康状态，为中文管理后台工作台提供真实的后端连接信息。该模块不包含智能体业务管理功能。

## 结构

```mermaid
flowchart LR
  Dashboard[AdminDashboardView]
  Store[SystemStatusStore]
  UseCase[GetSystemStatus]
  Port[HealthStatusGateway]
  Adapter[HttpHealthStatusGateway]
  Client[FetchHttpClient]
  Dashboard --> Store
  Store --> UseCase
  UseCase --> Port
  Adapter -. implements .-> Port
  Adapter --> Client
```

```text
system/
├── domain/system-status.ts
├── application/
│   ├── health-status.gateway.ts
│   └── get-system-status.ts
├── infrastructure/http-health-status.gateway.ts
└── stores/system-status.store.ts
```

## 功能

- 管理工作台加载时请求 `GET /health`。
- Pinia 管理空闲、加载、成功和失败状态。
- 工作台展示后端运行状态和中文错误信息。
- 用户可主动重新检查连接。

## 配置

- `VITE_API_BASE_URL`：API 全局前缀地址。

## 测试范围

- 应用用例测试验证网关结果原样返回。
- 类型检查验证 Vue 模板、Pinia 状态和路由定义。
- 构建检查验证模块可被 Vite 正确打包。

## 扩展方式

新增系统指标时先扩展领域契约和 API 校验，再扩展 Store 与展示组件。其他业务模块不得直接复用该 Store，应通过自己的应用边界获取数据。
