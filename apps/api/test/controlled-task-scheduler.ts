interface ControlledTaskScheduler {
  dispatch(): void;
  onApplicationBootstrap(): void;
  onApplicationShutdown(): Promise<void>;
}

export function createControlledTaskScheduler(
  execute: () => Promise<unknown>,
): ControlledTaskScheduler {
  let activeTask: Promise<void> | undefined;

  return {
    dispatch: (): void => {
      if (!activeTask) {
        activeTask = execute()
          .then(() => undefined)
          .finally(() => {
            activeTask = undefined;
          });
      }
    },
    onApplicationBootstrap: (): void => undefined,
    onApplicationShutdown: async (): Promise<void> => {
      await activeTask;
    },
  };
}
