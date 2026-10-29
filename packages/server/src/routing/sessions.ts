export interface PluginSessionInfo {
  id: string;
  fileName: string | null;
  pageName: string | null;
  lastActivityAt: number;
  pluginVersion: string;
}

export const sessionsMatchingFile = (
  sessions: readonly PluginSessionInfo[],
  fileName: string,
): readonly PluginSessionInfo[] => {
  const wanted = fileName.trim().toLowerCase();
  return sessions.filter(s => s.fileName !== null && s.fileName.trim().toLowerCase() === wanted);
};

export const describeSessions = (sessions: readonly PluginSessionInfo[]): string => {
  if (sessions.length === 0) return 'none';
  return sessions.map(s => `${s.fileName ?? '(unnamed)'} [${s.id}]`).join(', ');
};
