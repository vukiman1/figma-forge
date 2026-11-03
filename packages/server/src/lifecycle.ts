type Listenable = Pick<NodeJS.EventEmitter, 'on'>;

export const DEFAULT_HARD_EXIT_DELAY_MS = 5_000;

export interface ShutdownWiring {
  proc: Listenable;
  stdin: Listenable;
  shutdown: () => void | Promise<void>;
  hardExit?: () => void;
  hardExitDelayMs?: number;
}

const armHardExit = (hardExit: (() => void) | undefined, delayMs: number | undefined): void => {
  if (hardExit === undefined) return;
  const timer = setTimeout(hardExit, delayMs ?? DEFAULT_HARD_EXIT_DELAY_MS);
  timer.unref();
};

export const wireShutdown = ({
  proc,
  stdin,
  shutdown,
  hardExit,
  hardExitDelayMs,
}: ShutdownWiring): (() => void) => {
  let isTriggered = false;
  const trigger = (): void => {
    if (isTriggered) return;
    isTriggered = true;
    armHardExit(hardExit, hardExitDelayMs);
    void shutdown();
  };
  proc.on('SIGINT', trigger);
  proc.on('SIGTERM', trigger);
  proc.on('SIGHUP', trigger);
  stdin.on('end', trigger);
  stdin.on('close', trigger);
  return trigger;
};
