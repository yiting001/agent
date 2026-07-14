# 使用 Zvec 作为默认向量索引

> 本决策已由 [ADR-0003](0003-postgresql-pgvector-redis-and-message-boundary.md) 取代，不再是当前生产实现。

## 状态

已采纳。

## 背景

知识平台原先通过 `VectorIndex` 端口连接独立 Qdrant 服务。当前部署目标以单机 NestJS
服务为主，希望减少额外服务，同时保留持久化、向量过滤和大规模近似检索能力。

Zvec 是阿里开源的进程内向量数据库，提供官方 Node.js Binding、WAL、内存映射、
标量倒排过滤以及 HNSW、DiskANN 等索引。

## 决策

- 默认适配器改为官方 `@zvec/zvec` Node.js Binding。
- 每个知识库对应一个 Zvec Collection，向量维度在创建知识库时锁定。
- Collection 保存切片向量、正文、文档标识、文件名、模块标识和切片序号。
- `moduleId` 建立倒排索引，检索时使用 `IN` 条件只召回智能体绑定的共享模块。
- 默认使用 HNSW + Cosine，适合对话场景的低延迟检索。
- `ZVEC_INDEX_TYPE=diskann` 可用于内存受限的超大向量集合，但仅支持 Linux，并要求
  系统具备兼容的 `libaio`。
- 写入按 `ZVEC_UPSERT_BATCH_SIZE` 分批并主动让出事件循环，完成单个文档后执行索引优化。
- `ZVEC_DATA_PATH` 必须位于持久磁盘，不能使用容器临时文件系统。

## 部署约束

Zvec 支持多个读取进程，但同一个 Collection 只允许单写进程。当前 API 和异步处理器位于同一
NestJS 进程，因此单实例部署满足约束。

如果后续需要多个写副本或跨机器共享索引，不修改领域和应用层，只替换 `VectorIndex` 基础设施
适配器为服务型向量数据库。

## 结果

- 本地和单机部署不再需要单独启动向量数据库容器。
- WAL 和内存映射提供本地持久化与高效访问。
- 原始文件、SQLite 元数据和 Zvec 数据仍保持职责分离。
- 备份必须同时覆盖 SQLite、`KNOWLEDGE_STORAGE_PATH` 和 `ZVEC_DATA_PATH`。
