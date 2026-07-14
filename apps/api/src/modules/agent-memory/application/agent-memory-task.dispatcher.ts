/** 新任务入队后唤醒后台调度器的应用层端口。 */
export abstract class AgentMemoryTaskDispatcher {
  /** 非阻塞请求一次调度；实现必须合并并发唤醒。 */
  abstract dispatch(): void;
}
