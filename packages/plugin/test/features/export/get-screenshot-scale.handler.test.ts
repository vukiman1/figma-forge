import type { GetScreenshotResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetScreenshotHandler } from '../../../src/features/export/get-screenshot.handler.js';
import { type ExportCall, fakeFigma } from './screenshot-fake.js';

describe('get_screenshot scaling', () => {
  it('auto-fits an oversized frame down (long edge → 2576) and reports the raster size', async () => {
    const calls: ExportCall[] = [];
    const big = {
      id: '2:1',
      absoluteRenderBounds: { x: 0, y: 0, width: 4000, height: 2000 },
      exportAsync: async (settings: ExportCall) => {
        calls.push(settings);
        return new Uint8Array([7]);
      },
    } as unknown as BaseNode;
    const handler = createGetScreenshotHandler(fakeFigma({ '2:1': big }, calls));
    const result = (await handler({ nodeIds: ['2:1'] })) as GetScreenshotResult;
    expect(calls[0]).toEqual({ format: 'PNG', constraint: { type: 'SCALE', value: 0.64 } });
    expect(result.images[0]).toEqual({
      nodeId: '2:1',
      format: 'PNG',
      base64: 'b64(1)',
      width: 2560,
      height: 1280,
      scale: 0.64,
    });
  });

  it('keeps a mid-size node at 1x, and honors an explicit scale over auto-fit', async () => {
    const calls: ExportCall[] = [];
    const mkNode = (id: string, width: number, height: number): BaseNode =>
      ({
        id,
        absoluteRenderBounds: { x: 0, y: 0, width, height },
        exportAsync: async (settings: ExportCall) => {
          calls.push(settings);
          return new Uint8Array([1]);
        },
      }) as unknown as BaseNode;
    const lookup = { '3:1': mkNode('3:1', 800, 600), '3:2': mkNode('3:2', 3072, 2000) };

    const handler = createGetScreenshotHandler(fakeFigma(lookup, calls));
    const mid = (await handler({ nodeIds: ['3:1'] })) as GetScreenshotResult;
    expect(calls[0]?.constraint).toEqual({ type: 'SCALE', value: 1 });
    expect(mid.images[0]).toMatchObject({ width: 800, height: 600, scale: 1 });

    const forced = (await handler({ nodeIds: ['3:2'], scale: 1 })) as GetScreenshotResult;
    expect(calls[1]?.constraint).toEqual({ type: 'SCALE', value: 1 });
    expect(forced.images[0]).toMatchObject({ width: 3072, height: 2000, scale: 1 });
  });

  it('caps an explicit scale to the 2576px vision ceiling only when forVision is set, since a model downsamples past it', async () => {
    const calls: ExportCall[] = [];
    const node = {
      id: '4:1',
      absoluteRenderBounds: { x: 0, y: 0, width: 1440, height: 5056 },
      exportAsync: async (settings: ExportCall) => {
        calls.push(settings);
        return new Uint8Array([1]);
      },
    } as unknown as BaseNode;
    const handler = createGetScreenshotHandler(fakeFigma({ '4:1': node }, calls));

    const capped = (await handler({
      nodeIds: ['4:1'],
      scale: 4,
      forVision: true,
    })) as GetScreenshotResult;
    expect(calls[0]?.constraint).toEqual({ type: 'SCALE', value: 0.51 });
    expect(capped.images[0]).toMatchObject({ scale: 0.51, height: 2579 });

    const full = (await handler({ nodeIds: ['4:1'], scale: 4 })) as GetScreenshotResult;
    expect(calls[1]?.constraint).toEqual({ type: 'SCALE', value: 4 });
    expect(full.images[0]).toMatchObject({ scale: 4, height: 20224 });

    await handler({ nodeIds: ['4:1'], scale: 0.25, forVision: true });
    expect(calls[2]?.constraint).toEqual({ type: 'SCALE', value: 0.25 });
  });

  it('drops the whole batch to a 2000px ceiling past 20 nodes, since one oversized image fails the whole request', async () => {
    const calls: ExportCall[] = [];
    const mk = (id: string): BaseNode =>
      ({
        id,
        absoluteRenderBounds: { x: 0, y: 0, width: 3000, height: 2000 },
        exportAsync: async (settings: ExportCall) => {
          calls.push(settings);
          return new Uint8Array([1]);
        },
      }) as unknown as BaseNode;
    const ids = Array.from({ length: 21 }, (_, i) => `5:${i}`);
    const lookup = Object.fromEntries(ids.map(id => [id, mk(id)]));
    const handler = createGetScreenshotHandler(fakeFigma(lookup, calls));

    await handler({ nodeIds: ids.slice(0, 20), forVision: true });
    expect(calls.every(c => c.constraint?.value === 0.86)).toBe(true);

    calls.length = 0;
    await handler({ nodeIds: ids, forVision: true });
    expect(calls).toHaveLength(21);
    expect(calls.every(c => c.constraint?.value === 0.67)).toBe(true);

    calls.length = 0;
    await handler({ nodeIds: ids, scale: 4, forVision: true });
    expect(calls.every(c => c.constraint?.value === 0.67)).toBe(true);

    calls.length = 0;
    await handler({ nodeIds: ids, scale: 4 });
    expect(calls.every(c => c.constraint?.value === 4)).toBe(true);
  });
});
