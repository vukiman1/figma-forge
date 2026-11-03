import { Console } from 'node:console';

const MAX_REPORTS = 50;

interface ProcessLike {
  on(event: 'uncaughtException', listener: (error: Error) => void): unknown;
  on(event: 'unhandledRejection', listener: (reason: unknown) => void): unknown;
}

interface StreamLike {
  on(event: 'error', listener: (error: Error) => void): unknown;
}

const describeError = (error: unknown): string =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

export const guardProcess = (proc: ProcessLike, write: (text: string) => void): void => {
  let reports = 0;
  let isReporting = false;
  const report = (kind: string, error: unknown): void => {
    if (isReporting) return;
    reports += 1;
    if (reports > MAX_REPORTS) return;
    isReporting = true;
    const tail = reports === MAX_REPORTS ? ' (further reports suppressed)' : '';
    try {
      write(`[figma-forge] ${kind} — kept running${tail}: ${describeError(error)}\n`);
    } catch {
      return;
    } finally {
      isReporting = false;
    }
  };
  proc.on('uncaughtException', error => report('uncaught exception', error));
  proc.on('unhandledRejection', reason => report('unhandled rejection', reason));
};

const ignoreStreamError = (): undefined => undefined;

export const muteStreamErrors = (...streams: StreamLike[]): void => {
  for (const stream of streams) stream.on('error', ignoreStreamError);
};

export const consoleToStderr = (target: Console, stderr: NodeJS.WritableStream): void => {
  Object.assign(target, new Console({ stdout: stderr, stderr }));
};
