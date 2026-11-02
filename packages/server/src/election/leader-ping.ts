import { z } from 'zod';

import type { PluginSessionInfo } from '../routing/sessions.js';

export interface LeaderInfo {
  serverVersion: string;
  buildId: number | undefined;
}

export interface LeaderPing {
  readonly info: LeaderInfo;
  readonly activeSessionId: string | undefined;
  readonly sessions: readonly PluginSessionInfo[];
}

const UNKNOWN_PLUGIN_VERSION = 'unknown';

const SessionEntrySchema = z.object({
  id: z.string(),
  fileName: z.string().nullable().catch(null),
  pageName: z.string().nullable().catch(null),
  lastActivityAt: z.number().catch(0),
  pluginVersion: z.string().catch(UNKNOWN_PLUGIN_VERSION),
});

const LeaderPingSchema = z.object({
  ok: z.literal(true),
  serverVersion: z.string(),
  buildId: z.number().optional().catch(undefined),
  activeSessionId: z.string().optional().catch(undefined),
  sessions: z.array(z.unknown()).catch([]),
});

const parseSessions = (entries: readonly unknown[]): readonly PluginSessionInfo[] =>
  entries.flatMap(entry => {
    const parsed = SessionEntrySchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });

export const parseLeaderPing = (body: unknown): LeaderPing | undefined => {
  const parsed = LeaderPingSchema.safeParse(body);
  if (!parsed.success) return undefined;
  const { serverVersion, buildId, activeSessionId, sessions } = parsed.data;
  return {
    info: { serverVersion, buildId },
    activeSessionId,
    sessions: parseSessions(sessions),
  };
};
