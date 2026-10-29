import type { MutateResult } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import { createSetTextPropertiesHandler } from '../../../src/features/text/set-text-properties.handler.js';

const MIXED = Symbol('mixed');

const fakeFigma = (
  node: unknown,
  loadFontAsync = vi.fn<() => Promise<void>>(async () => {}),
): typeof figma =>
  ({
    mixed: MIXED,
    loadFontAsync,
    getNodeByIdAsync: async (id: string) => (id === '1:1' ? node : null),
  }) as unknown as typeof figma;

describe('set_text_properties on a mixed-font node', () => {
  it('loads the target face without mutating the frozen range font list', async () => {
    const loadFontAsync = vi.fn<() => Promise<void>>(async () => {});
    const node = {
      id: '1:1',
      type: 'TEXT',
      characters: 'ab',
      fontName: MIXED as unknown,
      getRangeAllFontNames: () =>
        Object.freeze([
          { family: 'Inter', style: 'Regular' },
          { family: 'Inter', style: 'Bold' },
        ]),
    };
    await createSetTextPropertiesHandler(fakeFigma(node, loadFontAsync))({
      nodeId: '1:1',
      fontName: { family: 'Inter', style: 'Medium' },
    });
    expect(node.fontName).toEqual({ family: 'Inter', style: 'Medium' });
    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Bold' });
    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Medium' });
  });

  it('sets horizontal and vertical text alignment, loading the font first', async () => {
    const loadFontAsync = vi.fn<() => Promise<void>>(async () => {});
    const node = {
      id: '1:1',
      type: 'TEXT',
      characters: 'hi',
      fontName: { family: 'Inter', style: 'Regular' },
      textAlignHorizontal: 'LEFT',
      textAlignVertical: 'TOP',
    };
    const result = (await createSetTextPropertiesHandler(fakeFigma(node, loadFontAsync))({
      nodeId: '1:1',
      textAlignHorizontal: 'CENTER',
      textAlignVertical: 'BOTTOM',
    })) as MutateResult;

    expect(node).toMatchObject({ textAlignHorizontal: 'CENTER', textAlignVertical: 'BOTTOM' });
    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
    expect(result).toEqual({ ok: true, nodeId: '1:1' });
  });

  it('leaves alignment alone when it is not passed, and rejects a non-string value', async () => {
    const node = {
      id: '1:1',
      type: 'TEXT',
      characters: 'hi',
      fontName: { family: 'Inter', style: 'Regular' },
      textAlignHorizontal: 'RIGHT',
      textAlignVertical: 'CENTER',
    };
    await createSetTextPropertiesHandler(fakeFigma(node))({ nodeId: '1:1', fontSize: 14 });
    expect(node).toMatchObject({ textAlignHorizontal: 'RIGHT', textAlignVertical: 'CENTER' });
    await expect(
      createSetTextPropertiesHandler(fakeFigma(node))({ nodeId: '1:1', textAlignHorizontal: 1 }),
    ).rejects.toThrow(/textAlignHorizontal: Invalid option/);
  });
});

describe('set_text_properties on text set along a path', () => {
  it('sets the typography and the two alignments a path has', async () => {
    const node = {
      id: '1:1',
      type: 'TEXT_PATH',
      characters: 'Round',
      fontName: { family: 'Inter', style: 'Regular' },
    };
    await createSetTextPropertiesHandler(fakeFigma(node))({
      nodeId: '1:1',
      fontSize: 18,
      letterSpacing: { unit: 'PERCENT', value: 8 },
      textAlignHorizontal: 'CENTER',
      textAlignVertical: 'BOTTOM',
    });
    expect(node).toMatchObject({
      fontSize: 18,
      letterSpacing: { unit: 'PERCENT', value: 8 },
      textAlignHorizontal: 'CENTER',
      textAlignVertical: 'BOTTOM',
    });
  });

  it('refuses the line, box and decoration fields a path lacks — all of them, before writing', async () => {
    const node: Record<string, unknown> = {
      id: '1:1',
      type: 'TEXT_PATH',
      characters: 'Round',
      fontName: { family: 'Inter', style: 'Regular' },
    };
    await expect(
      createSetTextPropertiesHandler(fakeFigma(node))({
        nodeId: '1:1',
        fontSize: 18,
        lineHeight: { unit: 'AUTO' },
        textDecoration: 'UNDERLINE',
        maxLines: 2,
      }),
    ).rejects.toThrow('is text on a path, which has no lineHeight, textDecoration, maxLines');
    expect(node).not.toHaveProperty('fontSize');
  });
});
