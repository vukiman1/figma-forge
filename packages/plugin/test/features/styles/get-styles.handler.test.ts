import type { GetStylesResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetStylesHandler } from '../../../src/features/styles/get-styles.handler.js';

const fakeFigma = (
  over: Partial<Record<string, unknown[]>> = {},
  variables?: Record<string, { name: string; resolvedType: string; codeSyntax?: unknown }>,
): typeof figma =>
  ({
    getLocalPaintStylesAsync: async () => over.paints ?? [],
    getLocalTextStylesAsync: async () => over.texts ?? [],
    getLocalEffectStylesAsync: async () => over.effects ?? [],
    getLocalGridStylesAsync: async () => over.grids ?? [],
    ...(variables === undefined
      ? {}
      : {
          variables: {
            getVariableByIdAsync: async (id: string) => variables[id] ?? null,
          },
        }),
  }) as unknown as typeof figma;

describe('get_styles handler', () => {
  it('reports no cssAngle on a paint style’s gradient', async () => {
    const handler = createGetStylesHandler(
      fakeFigma({
        paints: [
          {
            id: 'S:9',
            name: 'Brand/Gradient',
            key: 'k9',
            description: '',
            paints: [
              {
                type: 'GRADIENT_LINEAR',
                visible: true,
                opacity: 1,
                gradientStops: [{ position: 0, color: { r: 1, g: 0, b: 0, a: 1 } }],
                gradientTransform: [
                  [0.5, 0.5, 0],
                  [0, 1, 0],
                ],
              },
            ],
          },
        ],
      }),
    );
    const out = (await handler({})) as {
      paints: { paints: { cssAngle?: number; gradientTransform?: number[][] }[] }[];
    };
    expect(out.paints[0]?.paints[0]).not.toHaveProperty('cssAngle');
    expect(out.paints[0]?.paints[0]?.gradientTransform).toEqual([
      [0.5, 0.5, 0],
      [0, 1, 0],
    ]);
  });

  it('groups the four style categories with their payloads', async () => {
    const handler = createGetStylesHandler(
      fakeFigma({
        paints: [
          {
            id: 'S:1',
            name: 'Brand/Primary',
            key: 'k1',
            description: 'primary',
            paints: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 0, b: 0 } }],
          },
        ],
        texts: [
          {
            id: 'S:2',
            name: 'Body',
            key: 'k2',
            description: '',
            fontName: { family: 'Inter', style: 'Regular' },
            fontSize: 16,
            lineHeight: { unit: 'PIXELS', value: 24 },
            letterSpacing: { unit: 'PERCENT', value: 0 },
            textWrapStyle: 'BALANCE',
          },
        ],
        effects: [
          {
            id: 'S:3',
            name: 'Card Shadow',
            key: 'k3',
            description: '',
            effects: [
              {
                type: 'DROP_SHADOW',
                visible: true,
                radius: 4,
                color: { r: 0, g: 0, b: 0, a: 0.2 },
                offset: { x: 0, y: 2 },
                spread: 0,
                blendMode: 'NORMAL',
              },
            ],
          },
        ],
        grids: [
          {
            id: 'S:4',
            name: '12 Col',
            key: 'k4',
            description: '',
            layoutGrids: [
              {
                pattern: 'COLUMNS',
                visible: true,
                count: 12,
                gutterSize: 20,
                alignment: 'STRETCH',
              },
            ],
          },
        ],
      }),
    );
    const result = (await handler(undefined)) as GetStylesResult;
    expect(result.paints[0]?.paints[0]).toMatchObject({
      type: 'SOLID',
      color: { r: 1, g: 0, b: 0 },
    });
    expect(result.texts[0]).toMatchObject({
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 16,
      lineHeight: { unit: 'PIXELS', value: 24 },
      textWrapStyle: 'BALANCE',
    });
    expect(result.effects[0]?.effects[0]?.type).toBe('DROP_SHADOW');
    expect(result.grids[0]?.grids[0]?.count).toBe(12);
  });

  it('serializes AUTO line height without a value', async () => {
    const handler = createGetStylesHandler(
      fakeFigma({
        texts: [
          {
            id: 'S:5',
            name: 'Auto',
            key: 'k5',
            description: '',
            fontName: { family: 'Inter', style: 'Bold' },
            fontSize: 12,
            lineHeight: { unit: 'AUTO' },
            letterSpacing: { unit: 'PIXELS', value: 1 },
          },
        ],
      }),
    );
    const result = (await handler(undefined)) as GetStylesResult;
    expect(result.texts[0]?.lineHeight).toEqual({ unit: 'AUTO' });
  });

  it("carries a text style's variable-font axis values", async () => {
    const handler = createGetStylesHandler(
      fakeFigma({
        texts: [
          {
            id: 'S:6',
            name: 'Heading/H1',
            key: 'k6',
            description: '',
            fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 720 } },
            fontSize: 32,
            lineHeight: { unit: 'AUTO' },
            letterSpacing: { unit: 'PIXELS', value: 0 },
          },
        ],
      }),
    );
    const result = (await handler(undefined)) as GetStylesResult;
    expect(result.texts[0]?.fontName).toEqual({
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 720 },
    });
  });

  it('returns empty arrays when the document has no styles', async () => {
    const result = (await createGetStylesHandler(fakeFigma())(undefined)) as GetStylesResult;
    expect(result).toEqual({ paints: [], texts: [], effects: [], grids: [] });
  });
});
