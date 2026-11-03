import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GET_SCREENSHOT_TOOL_NAME, LIST_FILES_TOOL_NAME } from '@figma-forge/core';
import {
  GET_ANNOTATIONS_TOOL_NAME,
  GET_DESIGN_CONTEXT_TOOL_NAME,
  GET_FONTS_TOOL_NAME,
  GET_REACTIONS_TOOL_NAME,
  GET_VIEWPORT_TOOL_NAME,
  type GetAnnotationsResult,
  type GetDesignContextResult,
  type GetFontsResult,
  type GetReactionsResult,
  type GetScreenshotResult,
  type GetViewportResult,
  type ListFilesResult,
} from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';

import { dispatchTool } from '../../src/dispatch/dispatch.js';
import { handleSaveScreenshots } from '../../src/tools/export/save-screenshots.handler.js';
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

describe('e2e get_viewport', () => {
  it('returns center / zoom / bounds', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetViewportResult = {
      center: { x: 0, y: 0 },
      zoom: 1,
      bounds: { x: 0, y: 0, width: 1280, height: 720 },
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_VIEWPORT_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_VIEWPORT_TOOL_NAME,
      {},
    )) as GetViewportResult;
    expect(result).toEqual(response);
  });
});

describe('e2e get_fonts', () => {
  it('returns frequency-sorted fonts', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetFontsResult = {
      fonts: [{ fontName: { family: 'Inter', style: 'Regular' }, count: 3 }],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_FONTS_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_FONTS_TOOL_NAME,
      {},
    )) as GetFontsResult;
    expect(result).toEqual(response);
  });
});

describe('e2e get_annotations', () => {
  it('returns annotated nodes', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetAnnotationsResult = {
      annotations: [{ nodeId: '1:1', nodeName: 'Card', annotations: [{ label: 'Use token' }] }],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [GET_ANNOTATIONS_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_ANNOTATIONS_TOOL_NAME,
      {},
    )) as GetAnnotationsResult;
    expect(result).toEqual(response);
  });
});

describe('e2e get_reactions', () => {
  it('round-trips nodeId and returns reactions', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetReactionsResult = {
      nodeId: '1:1',
      reactions: [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'BACK' }] }],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: {
          [GET_REACTIONS_TOOL_NAME]: params => {
            expect((params as { nodeId: string }).nodeId).toBe('1:1');
            return response;
          },
        },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_REACTIONS_TOOL_NAME,
      { nodeId: '1:1' },
    )) as GetReactionsResult;
    expect(result).toEqual(response);
  });
});

describe('e2e list_files', () => {
  it('returns the current file', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: ListFilesResult = {
      files: [
        { fileKey: 'abc', fileName: 'Mockups.fig', currentPage: { id: 'p-1', name: 'Cover' } },
      ],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: { [LIST_FILES_TOOL_NAME]: () => response },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      LIST_FILES_TOOL_NAME,
      {},
    )) as ListFilesResult;
    expect(result).toEqual(response);
  });
});

describe('e2e get_design_context', () => {
  it('round-trips params and returns the depth-limited tree', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetDesignContextResult = {
      nodes: [
        {
          id: 'r',
          name: 'Root',
          type: 'FRAME',
          children: [{ id: 'c', name: 'Child', type: 'TEXT' }],
        },
      ],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: {
          [GET_DESIGN_CONTEXT_TOOL_NAME]: params => {
            expect(params).toEqual({ depth: 2, detail: 'compact' });
            return response;
          },
        },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_DESIGN_CONTEXT_TOOL_NAME,
      { depth: 2, detail: 'compact' },
    )) as GetDesignContextResult;
    expect(result.nodes[0]?.children?.[0]?.id).toBe('c');
  });
});

describe('e2e get_screenshot', () => {
  it('round-trips nodeIds and returns base64 images', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const response: GetScreenshotResult = {
      images: [{ nodeId: '1:1', format: 'PNG', base64: 'AAAA' }],
    };
    sockets.push(
      await connectFakePlugin({
        port: h.port,
        handlers: {
          [GET_SCREENSHOT_TOOL_NAME]: params => {
            expect((params as { nodeIds: string[] }).nodeIds).toEqual(['1:1']);
            return response;
          },
        },
      }),
    );
    const result = (await dispatchTool(
      { node: h.node, follower: h.follower },
      GET_SCREENSHOT_TOOL_NAME,
      { nodeIds: ['1:1'] },
    )) as GetScreenshotResult;
    expect(result.images[0]?.base64).toBe('AAAA');
  });
});

describe('e2e save_screenshots', () => {
  it('exports via the plugin and writes the bytes to disk', async () => {
    const h = await startLeader();
    harnesses.push(h);
    const dir = await mkdtemp(join(tmpdir(), 'e2e-save-screenshots-'));
    try {
      const response: GetScreenshotResult = {
        images: [{ nodeId: '1:1', format: 'PNG', base64: 'AAAA' }],
      };
      sockets.push(
        await connectFakePlugin({
          port: h.port,
          handlers: {
            [GET_SCREENSHOT_TOOL_NAME]: params => {
              expect((params as { nodeIds: string[] }).nodeIds).toEqual(['1:1']);
              return response;
            },
          },
        }),
      );

      const result = await handleSaveScreenshots(
        (tool, args) => dispatchTool({ node: h.node, follower: h.follower }, tool, args),
        { nodeIds: ['1:1'], outDir: dir },
      );

      const written = result.saved[0]?.path;
      expect(written).toBe(join(dir, '1-1.png'));
      expect((await readFile(written as string)).toString('base64')).toBe('AAAA');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
