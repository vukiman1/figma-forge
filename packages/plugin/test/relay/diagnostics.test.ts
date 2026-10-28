import { describe, expect, it } from 'vitest';

import type { PluginContextEvent } from '../../protocol/bridge.js';
import { buildDiagnosticBundle, DIAGNOSTIC_SCHEMA } from '../../ui/relay/diagnostics.js';
import { summarizePayload } from '../../ui/relay/payload.js';
import type { ActivityEntry, RelayClientState } from '../../ui/relay/state.js';

const baseState = (activity: ActivityEntry[]): RelayClientState => ({
  status: 'connected',
  port: 3055,
  sessionResumed: false,
  serverVersion: '0.1.0',
  lastError: null,
  versionNotice: null,
  foregroundFlag: true,
  connectedAt: 1_000,
  reconnectCount: 2,
  totalCalls: activity.length,
  failedCalls: activity.filter(e => e.status === 'error').length,
  activity,
});

const context = {
  fileName: 'My File',
  pageName: 'Page 1',
  editorType: 'figma',
  mode: 'default',
  apiVersion: '1.0.0',
  selectionCount: 1,
  selection: [{ id: '1:2', name: 'Card', type: 'FRAME', width: 100, height: 50 }],
} as unknown as PluginContextEvent;

const meta = { pluginVersion: '0.1.0', protocolVersion: '0.1.0', sessionId: 'sess-1', now: 0 };

interface BundleView {
  schema: string;
  exportedAt: string;
  versions: Record<string, unknown>;
  context: Record<string, unknown> | null;
  session: Record<string, unknown>;
  calls: Record<string, unknown>[];
}

const parseBundle = (json: string): BundleView => JSON.parse(json) as BundleView;

describe('buildDiagnosticBundle', () => {
  it('captures schema, versions, context and session', () => {
    const bundle = parseBundle(buildDiagnosticBundle(baseState([]), context, meta));
    expect(bundle.schema).toBe(DIAGNOSTIC_SCHEMA);
    expect(bundle.exportedAt).toBe(new Date(0).toISOString());
    expect(bundle.versions).toMatchObject({
      plugin: '0.1.0',
      protocol: '0.1.0',
      server: '0.1.0',
      editorType: 'figma',
      mode: 'default',
      apiVersion: '1.0.0',
    });
    expect(bundle.context).toMatchObject({ fileName: 'My File', pageName: 'Page 1' });
    expect(bundle.session).toEqual({ id: 'sess-1', reconnectCount: 2, totalCalls: 0 });
  });

  it('orders calls oldest-first though activity is newest-first, nesting request and result as objects rather than escaped strings', () => {
    const activity: ActivityEntry[] = [
      {
        id: 't-2',
        method: 'set_fills',
        startedAt: 2_000,
        status: 'ok',
        durationMs: 5,
        request: summarizePayload({ nodeId: '1:2' }),
        payload: summarizePayload({ ok: true }),
      },
      {
        id: 't-1',
        method: 'get_design_context',
        startedAt: 1_000,
        status: 'ok',
        durationMs: 9,
        request: summarizePayload({ nodeId: '3:21', detail: 'full' }),
        payload: summarizePayload({ nodes: [] }),
      },
    ];
    const bundle = parseBundle(buildDiagnosticBundle(baseState(activity), context, meta));
    expect(bundle.calls.map(c => c.method)).toEqual(['get_design_context', 'set_fills']);
    expect(bundle.calls[0]?.request).toEqual({ nodeId: '3:21', detail: 'full' });
    expect(bundle.calls[0]?.result).toEqual({ nodes: [] });
    expect(bundle.calls[0]?.startedAt).toBe(new Date(1_000).toISOString());
  });

  it('carries an error and omits result for a failed call', () => {
    const activity: ActivityEntry[] = [
      {
        id: 't-e',
        method: 'get_node',
        startedAt: 1_000,
        status: 'error',
        durationMs: 3,
        request: summarizePayload({ nodeId: 'bad' }),
        error: 'node not found',
      },
    ];
    const bundle = parseBundle(buildDiagnosticBundle(baseState(activity), context, meta));
    expect(bundle.calls[0]).toMatchObject({ status: 'error', error: 'node not found' });
    expect(bundle.calls[0]?.result).toBeUndefined();
  });

  it('keeps a truncated payload as a flagged string rather than invalid JSON', () => {
    const big = { items: Array.from({ length: 20_000 }, (_, i) => `item-${i}`) };
    const activity: ActivityEntry[] = [
      {
        id: 't-b',
        method: 'get_document',
        startedAt: 1_000,
        status: 'ok',
        payload: summarizePayload(big),
      },
    ];
    const bundle = parseBundle(buildDiagnosticBundle(baseState(activity), context, meta));
    expect(bundle.calls[0]?.result).toMatchObject({ truncated: true });
  });

  it('tolerates a null context', () => {
    const bundle = parseBundle(buildDiagnosticBundle(baseState([]), null, meta));
    expect(bundle.context).toBeNull();
    expect(bundle.versions.editorType).toBeNull();
  });
});
