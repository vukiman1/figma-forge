import { existsSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeSocket, connectFakePlugin } from './_helpers.js';
import { DIST_ENTRY, LATEST_CLIENT_PROTOCOL, WireClient } from './mcp-wire-fixtures.js';

describe.skipIf(!existsSync(DIST_ENTRY))('MCP wire contract (built dist)', () => {
  let client: WireClient;

  beforeAll(async () => {
    client = new WireClient();
    await client.start();
    await client.handshake(LATEST_CLIENT_PROTOCOL);
  }, 30_000);

  afterAll(async () => {
    await client?.stop();
  });

  it('carries raw Motion through the built server untouched, fields it has never seen included', async () => {
    const inventory = {
      rootNodeId: '1:1',
      coverage: { status: 'partial', visitedNodes: 3, animatedNodes: 1, reasons: ['read-error'] },
      diagnostics: [{ nodeId: '1:3', code: 'read-error', message: 'getter exploded' }],
      nodes: [
        {
          nodeId: 'I1:2;4:5',
          parentId: '1:2',
          name: 'Card title',
          type: 'TEXT',
          motion: {
            animationStyles: [],
            animations: {
              OPACITY: {
                baseValue: { type: 'FLOAT', value: 0 },
                timelineDuration: 4,
                loopMode: 'PING_PONG',
                tracks: [
                  {
                    id: 't',
                    keyframeOperation: 'SET',
                    keyframes: [
                      { id: 'a', timelinePosition: 1, value: { type: 'FLOAT', value: 0 } },
                      { id: 'b', timelinePosition: 1.25, value: { type: 'FLOAT', value: 1 } },
                    ],
                  },
                ],
              },
              effects: { 1: { RADIUS: { tracks: [] } } },
            },
            manualKeyframeTracks: {},
            timelines: [{ id: 'T:1', duration: 4, trigger: 'ON_LOAD' }],
          },
        },
      ],
    };
    const server = new WireClient();
    await server.start();
    await server.handshake(LATEST_CLIENT_PROTOCOL);
    const plugin = await connectFakePlugin({
      port: server.port,
      handlers: { get_motion_context: () => inventory },
    });

    try {
      const res = await server.send('tools/call', {
        name: 'get_motion_context',
        arguments: { nodeId: '1:1' },
      });
      const content = res.result?.content as { type: string; text: string }[];

      expect(res.result?.isError).toBeUndefined();
      expect(content).toHaveLength(1);
      expect(JSON.parse(content[0]?.text ?? '{}')).toEqual(inventory);
    } finally {
      closeSocket(plugin);
      await server.stop();
    }
  }, 30_000);

  it('hands a Motion variable alias to the plugin with its id, direct and in a batch', async () => {
    const alias = { type: 'VARIABLE_ALIAS', id: 'VariableID:12:3' };
    const trackOp = {
      nodeId: '1:2',
      field: { type: 'PROPERTY', name: 'OPACITY' },
      track: {
        keyframes: [{ timelinePosition: 1, value: { type: 'FLOAT', value: 1 }, easing: alias }],
      },
    };
    const styleOp = {
      nodeId: '1:3',
      styleId: 's',
      config: { props: { easing: alias, delay: alias, distance: alias } },
    };
    const received: Record<string, unknown> = {};
    const server = new WireClient();
    await server.start();
    await server.handshake(LATEST_CLIENT_PROTOCOL);
    const plugin = await connectFakePlugin({
      port: server.port,
      handlers: {
        apply_manual_keyframe_track: params => {
          received.apply_manual_keyframe_track = params;
          return { ok: true, nodeId: '1:2' };
        },
        apply_animation_style: params => {
          received.apply_animation_style = params;
          return { ok: true, nodeId: '1:3', appliedStyleId: 'A:1' };
        },
        batch: params => {
          received.batch = params;
          return { ok: true, results: [] };
        },
      },
    });

    try {
      const ops = [
        { tool: 'apply_manual_keyframe_track', params: trackOp },
        { tool: 'apply_animation_style', params: styleOp },
      ];
      for (const [name, args] of [
        ['apply_manual_keyframe_track', trackOp],
        ['apply_animation_style', styleOp],
        ['batch', { ops }],
      ] as const) {
        // eslint-disable-next-line no-await-in-loop -- one plugin, calls in order
        const res = await server.send('tools/call', { name, arguments: args });
        expect(res.result?.isError).toBeUndefined();
      }

      expect(received.apply_manual_keyframe_track).toMatchObject(trackOp);
      expect(received.apply_animation_style).toMatchObject(styleOp);
      expect(received.batch).toMatchObject({ ops });
      for (const value of Object.values(received)) {
        const requestId =
          typeof value === 'object' && value !== null && 'requestId' in value
            ? value.requestId
            : undefined;
        expect(typeof requestId).toBe('string');
      }
    } finally {
      closeSocket(plugin);
      await server.stop();
    }
  }, 30_000);

  it('surfaces a bad-argument call as a tool error the model can read, not a transport failure', async () => {
    const res = await client.send('tools/call', {
      name: 'get_node',
      arguments: { nodeId: 42 },
    });

    expect(res.result?.isError).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
