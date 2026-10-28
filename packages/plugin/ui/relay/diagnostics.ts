import type { PluginContextEvent } from '../../protocol/bridge.js';
import type { ActivityPayload } from './payload.js';
import type { ActivityEntry, RelayClientState } from './state.js';

export const DIAGNOSTIC_SCHEMA = 'figma-forge-diagnostic@1';

const PRETTY_PRINT_INDENT = 2;

export interface DiagnosticMeta {
  pluginVersion: string;
  protocolVersion: string;
  sessionId: string;
  userAgent?: string;
  now?: number;
}

const decodePayload = (p: ActivityPayload): unknown => {
  if (p.truncated) return { truncated: true, preview: p.preview };
  try {
    return JSON.parse(p.preview);
  } catch {
    return p.preview;
  }
};

const describeVersions = (
  state: RelayClientState,
  context: PluginContextEvent | null,
  meta: DiagnosticMeta,
): Record<string, unknown> => ({
  plugin: meta.pluginVersion,
  protocol: meta.protocolVersion,
  server: state.serverVersion,
  editorType: context?.editorType ?? null,
  mode: context?.mode ?? null,
  apiVersion: context?.apiVersion ?? null,
  ...(meta.userAgent === undefined ? {} : { userAgent: meta.userAgent }),
});

const describeContext = (context: PluginContextEvent | null): Record<string, unknown> | null =>
  context === null
    ? null
    : {
        fileName: context.fileName,
        pageName: context.pageName,
        selectionCount: context.selectionCount,
        selection: context.selection,
      };

const describeCall = (entry: ActivityEntry): Record<string, unknown> => ({
  method: entry.method,
  status: entry.status,
  startedAt: new Date(entry.startedAt).toISOString(),
  ...(entry.durationMs === undefined ? {} : { durationMs: entry.durationMs }),
  ...(entry.request === undefined ? {} : { request: decodePayload(entry.request) }),
  ...(entry.payload === undefined ? {} : { result: decodePayload(entry.payload) }),
  ...(entry.error === undefined ? {} : { error: entry.error }),
});

export const buildDiagnosticBundle = (
  state: RelayClientState,
  context: PluginContextEvent | null,
  meta: DiagnosticMeta,
): string => {
  const bundle = {
    schema: DIAGNOSTIC_SCHEMA,
    exportedAt: new Date(meta.now ?? Date.now()).toISOString(),
    versions: describeVersions(state, context, meta),
    context: describeContext(context),
    session: {
      id: meta.sessionId,
      reconnectCount: state.reconnectCount,
      totalCalls: state.totalCalls,
    },
    calls: state.activity.toReversed().map(describeCall),
  };
  return JSON.stringify(bundle, null, PRETTY_PRINT_INDENT);
};
