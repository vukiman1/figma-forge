import {
  GET_METADATA_TOOL_NAME,
  GET_NODE_TOOL_NAME,
  GET_NODES_INFO_TOOL_NAME,
  GET_PAGES_TOOL_NAME,
  type GetMetadataResult,
  type GetNodeResult,
  type GetNodesInfoResult,
  type GetPagesResult,
  SCAN_NODES_BY_TYPES_TOOL_NAME,
  SCAN_TEXT_NODES_TOOL_NAME,
  type ScanNodesByTypesResult,
  type ScanTextNodesResult,
  SEARCH_NODES_TOOL_NAME,
  type SearchNodesResult,
  serializeNode,
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

const mockNode = (id: string, parentId: string | null = null) =>
  serializeNode({
    id,
    name: `Node ${id}`,
    type: 'RECTANGLE',
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    parent: parentId === null ? null : { id: parentId },
  });

describe('e2e get_node', () => {
  it('returns serialized node when found', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const sandboxResponse: GetNodeResult = { node: mockNode('1:2', '1:1') };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: {
          [GET_NODE_TOOL_NAME]: params => {
            expect((params as { nodeId: string }).nodeId).toBe('1:2');
            return sandboxResponse;
          },
        },
      }),
    );
    const result = (await dispatchTool({ node: h.node, follower: h.follower }, GET_NODE_TOOL_NAME, {
      nodeId: '1:2',
    })) as GetNodeResult;
    expect(result.node?.id).toBe('1:2');
  });

  it('returns { node: null } when sandbox reports missing', async () => {
    const h = await startLeader();
    harnesses.push(h);
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_NODE_TOOL_NAME]: () => ({ node: null }) satisfies GetNodeResult },
      }),
    );
    const result = (await dispatchTool({ node: h.node, follower: h.follower }, GET_NODE_TOOL_NAME, {
      nodeId: '1:99',
    })) as GetNodeResult;
    expect(result.node).toBeNull();
  });
});

describe('e2e get_nodes_info', () => {
  it('round-trips an array preserving order with null slots', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetNodesInfoResult = {
      nodes: [mockNode('1:2'), null, mockNode('1:4')],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_NODES_INFO_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_NODES_INFO_TOOL_NAME,
      { nodeIds: ['1:2', '1:3', '1:4'] },
    )) as GetNodesInfoResult;
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0]?.id).toBe('1:2');
    expect(result.nodes[1]).toBeNull();
    expect(result.nodes[2]?.id).toBe('1:4');
  });
});

describe('e2e get_metadata', () => {
  it('returns fileName + currentPage + pages + the editor it is running in', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetMetadataResult = {
      fileName: 'Mockups.fig',
      currentPage: { id: 'p-2', name: 'Details' },
      pages: [
        { id: 'p-1', name: 'Cover' },
        { id: 'p-2', name: 'Details' },
      ],
      editorType: 'figma',
      mode: 'default',
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_METADATA_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_METADATA_TOOL_NAME,
      {},
    )) as GetMetadataResult;
    expect(result).toEqual(response);
  });
});

describe('e2e get_pages', () => {
  it("returns page list with each page's flows", async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetPagesResult = {
      pages: [
        { id: 'p-1', name: 'Cover', flows: [] },
        {
          id: 'p-2',
          name: 'Details',
          flows: [
            { nodeId: '2:1', name: '新使用者註冊' },
            { nodeId: '2:9', name: '新使用者註冊' },
          ],
        },
      ],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_PAGES_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_PAGES_TOOL_NAME,
      {},
    )) as GetPagesResult;
    expect(result).toEqual(response);
  });
});

describe('e2e search_nodes', () => {
  it('round-trips name/type args and returns matching nodes', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: SearchNodesResult = { nodes: [mockNode('1:2', '1:1')] };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: {
          [SEARCH_NODES_TOOL_NAME]: params => {
            expect(params).toEqual({ name: 'submit', type: 'TEXT' });
            return response;
          },
        },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      SEARCH_NODES_TOOL_NAME,
      { name: 'submit', type: 'TEXT' },
    )) as SearchNodesResult;
    expect(result.nodes.map(n => n.id)).toEqual(['1:2']);
  });
});

describe('e2e scan_text_nodes', () => {
  it('returns the text node array', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: ScanTextNodesResult = { nodes: [mockNode('1:2'), mockNode('1:3')] };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [SCAN_TEXT_NODES_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      SCAN_TEXT_NODES_TOOL_NAME,
      { root: '1:1' },
    )) as ScanTextNodesResult;
    expect(result.nodes).toHaveLength(2);
  });
});

describe('e2e scan_nodes_by_types', () => {
  it('round-trips types arg and returns matching nodes', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: ScanNodesByTypesResult = { nodes: [mockNode('1:2')] };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: {
          [SCAN_NODES_BY_TYPES_TOOL_NAME]: params => {
            expect((params as { types: string[] }).types).toEqual(['COMPONENT']);
            return response;
          },
        },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      SCAN_NODES_BY_TYPES_TOOL_NAME,
      { types: ['COMPONENT'] },
    )) as ScanNodesByTypesResult;
    expect(result.nodes.map(n => n.id)).toEqual(['1:2']);
  });
});
