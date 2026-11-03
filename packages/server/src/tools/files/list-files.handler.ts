import { LIST_FILES_TOOL_NAME, ListFilesResultSchema } from '@figma-forge/core';

import type { PluginSessionInfo } from '../../routing/sessions.js';
import { getFileTarget } from '../../routing/target.js';

export interface ConnectedFile {
  sessionId: string;
  fileKey: string | null;
  fileName: string | null;
  currentPage: { id: string; name: string } | null;
  pluginVersion: string;
  routed: boolean;
  bound: boolean;
  duplicateName?: boolean;
  error?: string;
}

export interface ProbedSession {
  session: PluginSessionInfo;
  fileKey: string | null;
  currentPage: { id: string; name: string } | null;
  error?: string;
}

export const LIST_FILES_PER_SESSION_TIMEOUT_MS = 5_000;

export type SessionDispatch = (
  sessionId: string,
  toolName: string,
  args: unknown,
  perCallTimeoutMs: number,
) => Promise<unknown>;

const probeSession = async (
  session: PluginSessionInfo,
  dispatch: SessionDispatch,
): Promise<ProbedSession> => {
  try {
    const result = await dispatch(
      session.id,
      LIST_FILES_TOOL_NAME,
      {},
      LIST_FILES_PER_SESSION_TIMEOUT_MS,
    );
    const file = ListFilesResultSchema.parse(result).files[0];
    if (file === undefined) throw new Error('plugin returned no file');
    return {
      session: { ...session, fileName: file.fileName, pageName: file.currentPage.name },
      fileKey: file.fileKey,
      currentPage: file.currentPage,
    };
  } catch (error: unknown) {
    return {
      session,
      fileKey: null,
      currentPage: session.pageName === null ? null : { id: '', name: session.pageName },
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const probeSessions = async (
  sessions: readonly PluginSessionInfo[],
  dispatch: SessionDispatch,
): Promise<readonly ProbedSession[]> =>
  Promise.all(sessions.map(session => probeSession(session, dispatch)));

export const namedSessions = async (
  sessions: readonly PluginSessionInfo[],
  dispatch: SessionDispatch,
): Promise<readonly PluginSessionInfo[]> =>
  (await probeSessions(sessions, dispatch)).map(probed => probed.session);

const createConnectedFile = (
  probed: ProbedSession,
  routedSessionId: string | undefined,
  boundSessionId: string | undefined,
): ConnectedFile => ({
  sessionId: probed.session.id,
  pluginVersion: probed.session.pluginVersion,
  routed: probed.session.id === routedSessionId,
  bound: probed.session.id === boundSessionId,
  fileKey: probed.fileKey,
  fileName: probed.session.fileName,
  currentPage: probed.currentPage,
  ...(probed.error === undefined ? {} : { error: probed.error }),
});

const normalizedFileName = (fileName: string): string => fileName.trim().toLowerCase();

const countFileNames = (files: readonly ConnectedFile[]): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const file of files) {
    if (file.fileName === null) continue;
    const key = normalizedFileName(file.fileName);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

const markDuplicateNames = (files: readonly ConnectedFile[]): ConnectedFile[] => {
  const counts = countFileNames(files);
  return files.map(file => {
    if (file.fileName === null) return file;
    const isDuplicate = (counts.get(normalizedFileName(file.fileName)) ?? 0) > 1;
    return isDuplicate ? { ...file, duplicateName: true } : file;
  });
};

export const handleListFiles = async (
  sessions: readonly PluginSessionInfo[],
  dispatch: SessionDispatch,
): Promise<{ files: ConnectedFile[] }> => {
  const boundSessionId = getFileTarget()?.sessionId;
  const routedSessionId = sessions[0]?.id;
  const probedSessions = await probeSessions(sessions, dispatch);
  const files = probedSessions.map(probed =>
    createConnectedFile(probed, routedSessionId, boundSessionId),
  );
  return { files: markDuplicateNames(files) };
};
