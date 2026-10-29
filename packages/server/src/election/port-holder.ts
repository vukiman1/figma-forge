import { readLeaderLock } from './leader-lock.js';
import { osProcessProbe, type ProcessProbe } from './process-probe.js';

export interface PortHolder {
  readonly pid: number;
  readonly buildId: number;
  readonly serverVersion: string;
  readonly stopped: boolean;
  readonly resumed: boolean;
}

export const PID_IDENTITY_TOLERANCE_MS = 2_000;

const STOPPED_STATE_PREFIX = 'T';

export const identifyPortHolder = (
  port: number,
  probe: ProcessProbe = osProcessProbe,
): PortHolder | undefined => {
  const lock = readLeaderLock(port);
  if (lock === undefined) return undefined;
  const live = probe.inspect(lock.pid);
  if (live === undefined) return undefined;
  if (Math.abs(live.startedAt - lock.processStartedAt) > PID_IDENTITY_TOLERANCE_MS) {
    return undefined;
  }
  return {
    pid: lock.pid,
    buildId: lock.buildId,
    serverVersion: lock.serverVersion,
    stopped: live.state.startsWith(STOPPED_STATE_PREFIX),
    resumed: false,
  };
};

export const resumeStoppedHolder = (
  holder: PortHolder,
  probe: ProcessProbe = osProcessProbe,
): PortHolder => {
  if (!holder.stopped) return holder;
  return { ...holder, resumed: probe.resume(holder.pid) };
};

export const diagnosePortHolder = (
  port: number,
  probe: ProcessProbe,
  log: (msg: string) => void,
): PortHolder | undefined => {
  const identified = identifyPortHolder(port, probe);
  if (identified === undefined) return undefined;
  const holder = resumeStoppedHolder(identified, probe);
  if (holder.resumed) log(`[election] port holder pid ${holder.pid} is suspended — sent SIGCONT`);
  return holder;
};
