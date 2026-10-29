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

describe('set_text_properties handler', () => {
  it('sets truncation / maxLines / autoResize on a TEXT node', async () => {
    const node = {
      id: '1:1',
      type: 'TEXT',
      fontName: { family: 'Inter', style: 'Regular' },
      textTruncation: 'DISABLED',
      maxLines: null,
      textAutoResize: 'NONE',
    };
    const handler = createSetTextPropertiesHandler(fakeFigma(node));
    const result = (await handler({
      nodeId: '1:1',
      textAutoResize: 'HEIGHT',
      textTruncation: 'ENDING',
      maxLines: 2,
    })) as MutateResult;

    expect(node).toMatchObject({ textAutoResize: 'HEIGHT', textTruncation: 'ENDING', maxLines: 2 });
    expect(result).toEqual({ ok: true, nodeId: '1:1' });
  });

  it("writes a variable font's axis values through, and loads that exact font", async () => {
    const loadFontAsync = vi.fn<() => Promise<void>>(async () => {});
    const node = {
      id: '1:1',
      type: 'TEXT',
      characters: 'hi',
      fontName: { family: 'Inter', style: 'Regular' },
    };
    await createSetTextPropertiesHandler(fakeFigma(node, loadFontAsync))({
      nodeId: '1:1',
      fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 650 } },
    });
    expect(node.fontName).toEqual({
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 650 },
    });
    expect(loadFontAsync).toHaveBeenCalledWith({
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 650 },
    });
  });

  it('accepts a fontName with no style, so Figma resolves the closest named instance', async () => {
    const node = {
      id: '1:1',
      type: 'TEXT',
      characters: 'hi',
      fontName: { family: 'Inter', style: 'Regular' },
    };
    await createSetTextPropertiesHandler(fakeFigma(node))({
      nodeId: '1:1',
      fontName: { family: 'Inter', variationSettings: { wght: 900 } },
    });
    expect(node.fontName).toEqual({ family: 'Inter', variationSettings: { wght: 900 } });
    expect(Object.hasOwn(node.fontName, 'style')).toBe(false);
  });

  it('rejects a non-numeric axis value instead of handing it to Figma', async () => {
    const node = {
      id: '1:1',
      type: 'TEXT',
      characters: 'hi',
      fontName: { family: 'Inter', style: 'Regular' },
    };
    await expect(
      createSetTextPropertiesHandler(fakeFigma(node))({
        nodeId: '1:1',
        fontName: { family: 'Inter', variationSettings: { wght: '650' } },
      }),
    ).rejects.toThrow(/variationSettings\.wght: Invalid input/);
    expect(node.fontName).toEqual({ family: 'Inter', style: 'Regular' });
  });

  it('leaves omitted fields untouched (partial update)', async () => {
    const node = {
      id: '1:1',
      type: 'TEXT',
      fontName: { family: 'Inter', style: 'Regular' },
      textTruncation: 'ENDING',
      maxLines: 3,
      textAutoResize: 'HEIGHT',
    };
    await createSetTextPropertiesHandler(fakeFigma(node))({ nodeId: '1:1', maxLines: null });
    expect(node).toMatchObject({
      textTruncation: 'ENDING',
      maxLines: null,
      textAutoResize: 'HEIGHT',
    });
  });

  it('sets typography after loading the node font and the new fontName', async () => {
    const loadFontAsync = vi.fn<() => Promise<void>>(async () => {});
    const node = {
      id: '1:1',
      type: 'TEXT',
      characters: 'hi',
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 12,
      lineHeight: { unit: 'AUTO' },
      letterSpacing: { unit: 'PERCENT', value: 0 },
      textCase: 'ORIGINAL',
      textDecoration: 'NONE',
    };
    const handler = createSetTextPropertiesHandler(fakeFigma(node, loadFontAsync));
    await handler({
      nodeId: '1:1',
      fontName: { family: 'Roboto', style: 'Bold' },
      fontSize: 24,
      lineHeight: { unit: 'PIXELS', value: 32 },
      letterSpacing: { unit: 'PIXELS', value: 1 },
      textCase: 'UPPER',
      textDecoration: 'UNDERLINE',
    });

    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Roboto', style: 'Bold' });
    expect(node).toMatchObject({
      fontName: { family: 'Roboto', style: 'Bold' },
      fontSize: 24,
      lineHeight: { unit: 'PIXELS', value: 32 },
      letterSpacing: { unit: 'PIXELS', value: 1 },
      textCase: 'UPPER',
      textDecoration: 'UNDERLINE',
    });
  });

  it('sets paragraphSpacing / paragraphIndent after loading fonts (they mutate text layout)', async () => {
    const loadFontAsync = vi.fn<() => Promise<void>>(async () => {});
    const node = {
      id: '1:1',
      type: 'TEXT',
      characters: 'First paragraph.\nSecond paragraph.',
      fontName: { family: 'Inter', style: 'Regular' },
      paragraphSpacing: 0,
      paragraphIndent: 0,
    };
    await createSetTextPropertiesHandler(fakeFigma(node, loadFontAsync))({
      nodeId: '1:1',
      paragraphSpacing: 12,
      paragraphIndent: 24,
    });

    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
    expect(node).toMatchObject({ paragraphSpacing: 12, paragraphIndent: 24 });
  });

  it('sets textWrapStyle after loading fonts (Figma requires it for this paragraph prop)', async () => {
    const loadFontAsync = vi.fn<() => Promise<void>>(async () => {});
    const node = {
      id: '1:1',
      type: 'TEXT',
      characters: 'A heading long enough to wrap',
      fontName: { family: 'Inter', style: 'Bold' },
      textWrapStyle: 'AUTO',
    };
    await createSetTextPropertiesHandler(fakeFigma(node, loadFontAsync))({
      nodeId: '1:1',
      textWrapStyle: 'BALANCE',
    });

    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Bold' });
    expect(node.textWrapStyle).toBe('BALANCE');
  });

  it.each(['textAutoResize', 'textTruncation', 'maxLines'])(
    'loads the node font before writing %s on its own',
    async field => {
      const loadFontAsync = vi.fn<() => Promise<void>>(async () => {});
      const node = {
        id: '1:1',
        type: 'TEXT',
        fontName: { family: 'Inter', style: 'Regular' },
        characters: 'hi',
        textAutoResize: 'NONE',
        textTruncation: 'DISABLED',
        maxLines: null,
      };
      const value = { textAutoResize: 'HEIGHT', textTruncation: 'ENDING', maxLines: 3 }[field];

      await createSetTextPropertiesHandler(fakeFigma(node, loadFontAsync))({
        nodeId: '1:1',
        [field]: value,
      });

      expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
      expect(node[field as keyof typeof node]).toBe(value);
    },
  );

  it('clears maxLines with an explicit null, still loading the font first', async () => {
    const loadFontAsync = vi.fn<() => Promise<void>>(async () => {});
    const node = {
      id: '1:1',
      type: 'TEXT',
      fontName: { family: 'Inter', style: 'Regular' },
      characters: 'hi',
      maxLines: 3,
    };
    await createSetTextPropertiesHandler(fakeFigma(node, loadFontAsync))({
      nodeId: '1:1',
      maxLines: null,
    });
    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
    expect(node.maxLines).toBeNull();
  });

  it('loads nothing when there is nothing to write', async () => {
    const loadFontAsync = vi.fn<() => Promise<void>>(async () => {});
    const node = { id: '1:1', type: 'TEXT', fontName: { family: 'Inter', style: 'Regular' } };
    await createSetTextPropertiesHandler(fakeFigma(node, loadFontAsync))({ nodeId: '1:1' });
    expect(loadFontAsync).not.toHaveBeenCalled();
  });

  it('throws on non-TEXT node, missing node, or bad input', async () => {
    await expect(
      createSetTextPropertiesHandler(fakeFigma({ id: '1:1', type: 'FRAME' }))({
        nodeId: '1:1',
        maxLines: 2,
      }),
    ).rejects.toThrow(/not a TEXT node/);
    await expect(
      createSetTextPropertiesHandler(fakeFigma(null))({ nodeId: '9:9' }),
    ).rejects.toThrow(/not a TEXT node/);
    await expect(createSetTextPropertiesHandler(fakeFigma(null))({})).rejects.toThrow(/nodeId/);
    await expect(
      createSetTextPropertiesHandler(fakeFigma({ id: '1:1', type: 'TEXT' }))({
        nodeId: '1:1',
        maxLines: 'x',
      }),
    ).rejects.toThrow(/maxLines/);
    await expect(
      createSetTextPropertiesHandler(fakeFigma({ id: '1:1', type: 'TEXT' }))({
        nodeId: '1:1',
        paragraphSpacing: -1,
      }),
    ).rejects.toThrow(/paragraphSpacing/);
    await expect(
      createSetTextPropertiesHandler(fakeFigma({ id: '1:1', type: 'TEXT' }))({
        nodeId: '1:1',
        paragraphIndent: -1,
      }),
    ).rejects.toThrow(/paragraphIndent/);
    await expect(
      createSetTextPropertiesHandler(fakeFigma({ id: '1:1', type: 'TEXT' }))({
        nodeId: '1:1',
        textWrapStyle: 3,
      }),
    ).rejects.toThrow(/textWrapStyle/);
  });
});
