import type { GetScreenshotResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetScreenshotHandler } from '../../../src/features/export/get-screenshot.handler.js';
import { type ExportCall, exportable, fakeFigma } from './screenshot-fake.js';

describe('get_screenshot handler', () => {
  it('exports each node to base64 with PNG + scale by default', async () => {
    const calls: ExportCall[] = [];
    const handler = createGetScreenshotHandler(
      fakeFigma({ '1:1': exportable('1:1', calls), '1:2': exportable('1:2', calls) }, calls),
    );
    const result = (await handler({ nodeIds: ['1:1', '1:2'] })) as GetScreenshotResult;
    expect(result.images).toEqual([
      { nodeId: '1:1', format: 'PNG', base64: 'b64(3)' },
      { nodeId: '1:2', format: 'PNG', base64: 'b64(3)' },
    ]);
    expect(calls[0]).toEqual({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
  });

  it('returns raw bytes instead of base64 when the server asks for binary', async () => {
    const calls: ExportCall[] = [];
    const handler = createGetScreenshotHandler(
      fakeFigma({ '1:1': exportable('1:1', calls) }, calls),
    );
    const result = (await handler({ nodeIds: ['1:1'], binary: true })) as GetScreenshotResult;
    expect(result.images).toEqual([
      { nodeId: '1:1', format: 'PNG', base64: null, bytes: new Uint8Array([1, 2, 3]) },
    ]);
  });

  it('keeps the clipped-node recovery path on the binary payload too', async () => {
    const calls: ExportCall[] = [];
    const clipped = {
      id: '2:2',
      visible: true,
      absoluteRenderBounds: null,
      absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 },
      exportAsync: async (settings: ExportCall) => {
        calls.push(settings);
        return new Uint8Array([9, 9]);
      },
    } as unknown as BaseNode;
    const handler = createGetScreenshotHandler(fakeFigma({ '2:2': clipped }, calls));
    const result = (await handler({ nodeIds: ['2:2'], binary: true })) as GetScreenshotResult;
    expect(result.images[0]).toMatchObject({
      nodeId: '2:2',
      base64: null,
      bytes: new Uint8Array([9, 9]),
      recovered: true,
    });
  });

  it('passes scale through for raster formats', async () => {
    const calls: ExportCall[] = [];
    const handler = createGetScreenshotHandler(
      fakeFigma({ '1:1': exportable('1:1', calls) }, calls),
    );
    await handler({ nodeIds: ['1:1'], format: 'JPG', scale: 2 });
    expect(calls[0]).toEqual({ format: 'JPG', constraint: { type: 'SCALE', value: 2 } });
  });

  it('uses constraint-free settings for SVG', async () => {
    const calls: ExportCall[] = [];
    const handler = createGetScreenshotHandler(
      fakeFigma({ '1:1': exportable('1:1', calls) }, calls),
    );
    await handler({ nodeIds: ['1:1'], format: 'SVG' });
    expect(calls[0]).toEqual({ format: 'SVG' });
  });

  it('returns null base64 for missing or non-exportable nodes', async () => {
    const handler = createGetScreenshotHandler(
      fakeFigma({ '1:9': null, '1:8': { id: '1:8' } as unknown as BaseNode }),
    );
    const result = (await handler({ nodeIds: ['1:9', '1:8'] })) as GetScreenshotResult;
    expect(result.images).toEqual([
      { nodeId: '1:9', format: 'PNG', base64: null },
      { nodeId: '1:8', format: 'PNG', base64: null },
    ]);
  });

  it('flags empty:true when the node rendered nothing (absoluteRenderBounds null)', async () => {
    const calls: ExportCall[] = [];
    const clipped = {
      id: '1:5',
      absoluteRenderBounds: null,
      exportAsync: async () => new Uint8Array([0]),
    } as unknown as BaseNode;
    const visible = {
      id: '1:6',
      absoluteRenderBounds: { x: 0, y: 0, width: 10, height: 10 },
      exportAsync: async () => new Uint8Array([1, 2, 3]),
    } as unknown as BaseNode;
    const handler = createGetScreenshotHandler(
      fakeFigma({ '1:5': clipped, '1:6': visible }, calls),
    );
    const result = (await handler({ nodeIds: ['1:5', '1:6'] })) as GetScreenshotResult;
    expect(result.images[0]).toEqual({
      nodeId: '1:5',
      format: 'PNG',
      base64: 'b64(1)',
      empty: true,
    });
    expect(result.images[1]).toEqual({
      nodeId: '1:6',
      format: 'PNG',
      base64: 'b64(3)',
      width: 40,
      height: 40,
      scale: 4,
    });
  });

  it('recovers a fully-clipped node via useAbsoluteBounds instead of shipping blank', async () => {
    const calls: ExportCall[] = [];
    const clippedWithBox = {
      id: '1:7',
      visible: true,
      absoluteRenderBounds: null,
      absoluteBoundingBox: { x: 0, y: 0, width: 150, height: 100 },
      exportAsync: async (settings: ExportCall) => {
        calls.push(settings);
        return new Uint8Array([9, 9, 9, 9]);
      },
    } as unknown as BaseNode;
    const handler = createGetScreenshotHandler(fakeFigma({ '1:7': clippedWithBox }, calls));
    const result = (await handler({ nodeIds: ['1:7'] })) as GetScreenshotResult;
    expect(result.images[0]).toEqual({
      nodeId: '1:7',
      format: 'PNG',
      base64: 'b64(4)',
      recovered: true,
      width: 512,
      height: 341,
      scale: 3.41,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 3.41 },
      useAbsoluteBounds: true,
    });
  });

  it('does not recover an intentionally hidden node (visible:false) — stays empty', async () => {
    const calls: ExportCall[] = [];
    const hidden = {
      id: '1:8',
      visible: false,
      absoluteRenderBounds: null,
      absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 50 },
      exportAsync: async (settings: ExportCall) => {
        calls.push(settings);
        return new Uint8Array([0]);
      },
    } as unknown as BaseNode;
    const handler = createGetScreenshotHandler(fakeFigma({ '1:8': hidden }, calls));
    const result = (await handler({ nodeIds: ['1:8'] })) as GetScreenshotResult;
    expect(result.images[0]).toEqual({
      nodeId: '1:8',
      format: 'PNG',
      base64: 'b64(1)',
      empty: true,
      width: 50,
      height: 50,
      scale: 1,
    });
    expect(calls[0]?.useAbsoluteBounds).toBeUndefined();
  });

  it('throws on empty/invalid nodeIds, bad format, or non-positive scale', async () => {
    const handler = createGetScreenshotHandler(fakeFigma({}));
    await expect(handler({ nodeIds: [] })).rejects.toThrow(/nodeIds/);
    await expect(handler({ nodeIds: [1] })).rejects.toThrow(/nodeIds/);
    await expect(handler({ nodeIds: ['1:1'], format: 'GIF' })).rejects.toThrow(/format/);
    await expect(handler({ nodeIds: ['1:1'], scale: 0 })).rejects.toThrow(/scale/);
  });
});
