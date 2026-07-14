import type {
  AgentMemoryIndex,
  IndexedAgentMemory,
} from '../src/modules/agent-memory/application/agent-memory.index';

export function createInMemoryAgentMemoryIndex(): AgentMemoryIndex {
  let memories: IndexedAgentMemory[] = [];

  return {
    clear: (agentId: string, ownerKey: string): Promise<void> => {
      memories = memories.filter(
        (memory) => memory.agentId !== agentId || memory.ownerKey !== ownerKey,
      );

      return Promise.resolve();
    },
    delete: (memoryIds: string[]): Promise<void> => {
      memories = memories.filter(
        (memory) => !memoryIds.includes(memory.memoryId),
      );

      return Promise.resolve();
    },
    exists: (memoryId: string): Promise<boolean> =>
      Promise.resolve(memories.some((memory) => memory.memoryId === memoryId)),
    search: (input) =>
      Promise.resolve(
        memories
          .filter(
            (memory) =>
              memory.agentId === input.agentId &&
              memory.ownerKey === input.ownerKey,
          )
          .slice(0, input.limit)
          .map((memory) => ({
            content: memory.content,
            memoryId: memory.memoryId,
            score: 0.9,
          })),
      ),
    upsert: (
      _dimensions: number,
      nextMemories: IndexedAgentMemory[],
    ): Promise<void> => {
      memories = [
        ...memories.filter(
          (current) =>
            !nextMemories.some(
              (memory) => memory.memoryId === current.memoryId,
            ),
        ),
        ...nextMemories,
      ];

      return Promise.resolve();
    },
  };
}
