import { describeSessions, type PluginSessionInfo, sessionsMatchingFile } from './sessions.js';

export interface FileTarget {
  sessionId: string;
  fileName: string | null;
}

export type SessionSource = () => Promise<readonly PluginSessionInfo[]>;

export class FileTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileTargetError';
  }
}

interface BindRequest {
  sessionId?: string;
  fileName?: string;
}

export interface BindOutcome {
  target: FileTarget;
  sessions: readonly PluginSessionInfo[];
}

let target: FileTarget | null = null;

export const getFileTarget = (): FileTarget | null => target;

export const clearFileTarget = (): void => {
  target = null;
};

export const setFileTarget = (next: FileTarget | null): void => {
  target = next;
};

const targetOf = (session: PluginSessionInfo): FileTarget => ({
  sessionId: session.id,
  fileName: session.fileName,
});

const listCandidates = (matches: readonly PluginSessionInfo[]): string =>
  matches.map(match => `${match.id} (page ${match.pageName ?? '?'})`).join(', ');

const connectedNow = (sessions: readonly PluginSessionInfo[]): string =>
  `Connected now: ${describeSessions(sessions)}`;

const pickById = (sessions: readonly PluginSessionInfo[], sessionId: string): PluginSessionInfo => {
  const match = sessions.find(session => session.id === sessionId);
  if (match !== undefined) return match;
  throw new FileTargetError(`no connected session ${sessionId}. ${connectedNow(sessions)}`);
};

const pickByName = (
  sessions: readonly PluginSessionInfo[],
  fileName: string,
): PluginSessionInfo => {
  const matches = sessionsMatchingFile(sessions, fileName);
  const [only] = matches;
  if (only === undefined) {
    throw new FileTargetError(`no connected file named "${fileName}". ${connectedNow(sessions)}`);
  }
  if (matches.length === 1) return only;
  throw new FileTargetError(
    `"${fileName}" matches ${matches.length} open files — Figma allows duplicate names, ` +
      `so the name alone cannot pick one. Call use_file again with one of these sessionIds: ` +
      listCandidates(matches),
  );
};

const pickSession = (
  sessions: readonly PluginSessionInfo[],
  request: BindRequest,
): PluginSessionInfo => {
  if (request.sessionId !== undefined) return pickById(sessions, request.sessionId);
  if (request.fileName !== undefined) return pickByName(sessions, request.fileName);
  throw new FileTargetError('use_file needs either fileName or sessionId');
};

export const bindFileTarget = async (
  probeSessions: SessionSource,
  request: BindRequest,
): Promise<BindOutcome> => {
  const sessions = await probeSessions();
  if (sessions.length === 0) {
    throw new FileTargetError(
      'no Figma file is connected — open the Figma Forge plugin in the file you want to work on, ' +
        'then call use_file again',
    );
  }
  const bound = targetOf(pickSession(sessions, request));
  target = bound;
  return { target: bound, sessions };
};

const recoverByName = (
  bound: FileTarget,
  sessions: readonly PluginSessionInfo[],
): PluginSessionInfo => {
  if (bound.fileName === null) {
    throw new FileTargetError(
      `the bound plugin session (${bound.sessionId}) is gone and it never reported a file name, ` +
        `so it cannot be recovered. ${connectedNow(sessions)}. ` +
        `Call use_file to pick one, or use_file({ release: true }) to follow the foreground file.`,
    );
  }
  const name = bound.fileName;
  const matches = sessionsMatchingFile(sessions, name);
  const [only] = matches;
  if (only !== undefined && matches.length === 1) return only;
  throw new FileTargetError(
    only === undefined
      ? `"${name}" is no longer connected — its Figma Forge panel was closed, or Figma was. ` +
          `${connectedNow(sessions)}. Reopen the plugin in "${name}", ` +
          `or call use_file to switch, or use_file({ release: true }) to follow the foreground file.`
      : `"${name}" now matches ${matches.length} open files, so the reopened panel cannot be ` +
          `identified by name. Call use_file with one of these sessionIds: ` +
          listCandidates(matches),
  );
};

export const resolveFileTarget = async (
  connectedSessions: SessionSource,
  probeSessions: SessionSource,
): Promise<string | undefined> => {
  const bound = target;
  if (bound === null) return undefined;
  const isBound = (session: PluginSessionInfo): boolean => session.id === bound.sessionId;
  if ((await connectedSessions()).some(isBound)) return bound.sessionId;
  const sessions = await probeSessions();
  if (sessions.some(isBound)) return bound.sessionId;
  const recovered = recoverByName(bound, sessions);
  target = targetOf(recovered);
  return recovered.id;
};
