import {
  GET_LOCAL_COMPONENTS_TOOL_NAME,
  GET_STYLES_TOOL_NAME,
  GET_VARIABLE_DEFS_TOOL_NAME,
  type GetLocalComponentsResult,
  type GetStylesResult,
  type GetVariableDefsResult,
} from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';

import { dispatchTool } from '../../src/dispatch.js';
import {
  closeSocket,
  connectFakePlugin,
  type LeaderHarness,
  startLeader,
  stopLeader,
} from './_helpers.js';

const harnesses: LeaderHarness[] = [];
const sockets: WebSocket[] = [];

afterEach(async () => {
  for (const ws of sockets) closeSocket(ws);
  sockets.length = 0;
  await Promise.all(harnesses.map(stopLeader));
  harnesses.length = 0;
});

describe('e2e get_styles', () => {
  it('returns the four grouped style categories', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetStylesResult = {
      paints: [
        {
          id: 'S:1',
          name: 'Primary',
          key: 'k1',
          description: '',
          paints: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 0, b: 0 } }],
        },
      ],
      texts: [],
      effects: [],
      grids: [],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_STYLES_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_STYLES_TOOL_NAME,
      {},
    )) as GetStylesResult;
    expect(result.paints[0]?.name).toBe('Primary');
    expect(result).toEqual(response);
  });

  it('carries per-object variable bindings and the variables table over the wire', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetStylesResult = {
      paints: [
        {
          id: 'S:1',
          name: 'Brand/Primary',
          key: 'k1',
          description: '',
          paints: [
            {
              type: 'SOLID',
              visible: true,
              opacity: 1,
              color: { r: 0.1, g: 0.2, b: 0.3 },
              boundVariables: { color: 'VariableID:1' },
            },
          ],
        },
      ],
      texts: [],
      effects: [
        {
          id: 'S:3',
          name: 'Elevation/focus',
          key: 'k3',
          description: '',
          effects: [
            {
              type: 'DROP_SHADOW',
              visible: true,
              radius: 24,
              color: { r: 0.729, g: 0.839, b: 0.898, a: 1 },
              offset: { x: 0, y: 4 },
              spread: 4,
              boundVariables: { color: 'VariableID:1', radius: 'VariableID:2' },
            },
          ],
        },
      ],
      grids: [],
      variables: {
        'VariableID:1': { name: 'color/information', type: 'COLOR' },
        'VariableID:2': { name: 'size/lg', type: 'FLOAT', codeSyntax: { WEB: '--size-lg' } },
      },
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_STYLES_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_STYLES_TOOL_NAME,
      {},
    )) as GetStylesResult;
    expect(result).toEqual(response);
    expect(result.effects[0]?.effects[0]?.boundVariables).toEqual({
      color: 'VariableID:1',
      radius: 'VariableID:2',
    });
    expect(result.variables?.['VariableID:1']?.name).toBe('color/information');
  });
});

describe('e2e get_variable_defs', () => {
  it('returns collections and variables with valuesByMode', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetVariableDefsResult = {
      collections: [
        {
          id: 'VC:1',
          name: 'Theme',
          key: 'ck',
          defaultModeId: 'm1',
          modes: [{ modeId: 'm1', name: 'Light' }],
          variableIds: ['V:1'],
        },
      ],
      variables: [
        {
          id: 'V:1',
          name: 'bg',
          key: 'vk',
          resolvedType: 'COLOR',
          collectionId: 'VC:1',
          valuesByMode: { m1: { r: 1, g: 1, b: 1, a: 1 } },
        },
      ],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_VARIABLE_DEFS_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_VARIABLE_DEFS_TOOL_NAME,
      {},
    )) as GetVariableDefsResult;
    expect(result).toEqual(response);
  });
});

describe('e2e get_local_components', () => {
  it('returns components and component sets', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetLocalComponentsResult = {
      components: [{ id: 'C:1', name: 'Icon', key: 'ck', description: '', parentId: null }],
      componentSets: [
        {
          id: 'CS:1',
          name: 'Button',
          key: 'csk',
          description: '',
          componentIds: ['C:2'],
          variantGroupProperties: { Size: { values: ['S', 'L'] } },
        },
      ],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_LOCAL_COMPONENTS_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_LOCAL_COMPONENTS_TOOL_NAME,
      {},
    )) as GetLocalComponentsResult;
    expect(result).toEqual(response);
  });
});
