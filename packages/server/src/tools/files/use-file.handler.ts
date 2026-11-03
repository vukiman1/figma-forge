import type { PluginSessionInfo } from '../../routing/sessions.js';
import {
  bindFileTarget,
  clearFileTarget,
  type FileTarget,
  getFileTarget,
  type SessionSource,
} from '../../routing/target.js';
import {
  type ConnectedFile,
  handleListFiles,
  namedSessions,
  type SessionDispatch,
} from './list-files.handler.js';

export interface UseFileResult {
  bound: FileTarget | null;
  files: ConnectedFile[];
}

export const handleUseFile = async (
  args: { fileName?: string; sessionId?: string; release?: boolean },
  listSessions: SessionSource,
  dispatch: SessionDispatch,
): Promise<UseFileResult> => {
  if (args.release === true) {
    clearFileTarget();
  } else if (args.fileName !== undefined || args.sessionId !== undefined) {
    await bindFileTarget(async () => namedSessions(await listSessions(), dispatch), args);
  }

  const sessions: readonly PluginSessionInfo[] = await listSessions();
  const { files } = await handleListFiles(sessions, dispatch);
  return { bound: getFileTarget(), files };
};
