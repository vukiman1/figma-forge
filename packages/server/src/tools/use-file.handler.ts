import type { PluginSessionInfo } from '../routing/sessions.js';
import {
  bindFileTarget,
  clearFileTarget,
  type FileTarget,
  getFileTarget,
  type SessionSource,
} from '../routing/target.js';
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
    // Bound against the plugins' own answers, not the relay's cached names: a session that
    // reconnected moments ago — which every leader handover and server restart causes — has not
    // reported a name yet, and matching against that cache would refuse a file that is plainly open.
    // Throws when the file can't be picked; never falls back to live routing, which would answer
    // "bound" while serving somebody else's file.
    await bindFileTarget(async () => namedSessions(await listSessions(), dispatch), args);
  }
  // No arguments at all is a read: "what is claimed, and what could be?" — the same question
  // list_files answers, so it answers it the same way rather than erroring.

  const sessions: readonly PluginSessionInfo[] = await listSessions();
  const { files } = await handleListFiles(sessions, dispatch);
  return { bound: getFileTarget(), files };
};
