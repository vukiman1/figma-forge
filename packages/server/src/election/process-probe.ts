import { execFileSync } from 'node:child_process';

export interface ProcessSnapshot {
  readonly state: string;
  readonly startedAt: number;
}

export interface ProcessProbe {
  inspect: (pid: number) => ProcessSnapshot | undefined;
  resume: (pid: number) => boolean;
}

const PS_TIMEOUT_MS = 2_000;
const LSTART = String.raw`\w{3}\s+\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4}`;
const PS_LINE = new RegExp(String.raw`^\s*(\S+)\s+(${LSTART})\s*$`);

const isProbeablePid = (pid: number): boolean =>
  process.platform !== 'win32' && Number.isInteger(pid) && pid > 0;

const readPsLine = (pid: number): string | undefined => {
  try {
    return execFileSync('ps', ['-ww', '-o', 'state=,lstart=', '-p', String(pid)], {
      encoding: 'utf8',
      timeout: PS_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, LC_ALL: 'C' },
    });
  } catch {
    return undefined;
  }
};

const parsePsLine = (line: string): ProcessSnapshot | undefined => {
  const match = PS_LINE.exec(line);
  const state = match?.[1];
  const lstart = match?.[2];
  if (state === undefined || lstart === undefined) return undefined;
  const startedAt = Date.parse(lstart);
  return Number.isNaN(startedAt) ? undefined : { state, startedAt };
};

const sendContinue = (pid: number): boolean => {
  try {
    process.kill(pid, 'SIGCONT');
    return true;
  } catch {
    return false;
  }
};

export const osProcessProbe: ProcessProbe = {
  inspect: pid => {
    if (!isProbeablePid(pid)) return undefined;
    const line = readPsLine(pid);
    return line === undefined ? undefined : parsePsLine(line);
  },
  resume: pid => isProbeablePid(pid) && sendContinue(pid),
};
