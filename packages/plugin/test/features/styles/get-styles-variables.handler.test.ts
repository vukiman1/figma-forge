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

const alias = (id: string): unknown => ({ type: 'VARIABLE_ALIAS', id });

describe('get_styles handler — variable bindings', () => {
  const boundStyles = {
    paints: [
      {
        id: 'S:1',
        name: 'Brand/Primary',
        key: 'k1',
        description: '',
        paints: [
          { type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 1, b: 0 } },
          {
            type: 'SOLID',
            visible: true,
            opacity: 1,
            color: { r: 0.1, g: 0.2, b: 0.3 },
            boundVariables: { color: alias('VariableID:paint') },
          },
        ],
        boundVariables: { paints: [alias('VariableID:paint')] },
      },
    ],
    texts: [
      {
        id: 'S:2',
        name: 'Body',
        key: 'k2',
        description: '',
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 24,
        lineHeight: { unit: 'PIXELS', value: 32 },
        letterSpacing: { unit: 'PERCENT', value: 0 },
        textWrapStyle: 'AUTO',
        boundVariables: { fontSize: alias('VariableID:text') },
      },
    ],
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
            offset: { x: 0, y: 2 },
            spread: 4,
            blendMode: 'NORMAL',
            boundVariables: {
              color: alias('VariableID:effect-color'),
              radius: alias('VariableID:effect-radius'),
            },
          },
        ],
        boundVariables: {
          effects: [alias('VariableID:effect-color'), alias('VariableID:effect-radius')],
        },
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
            gutterSize: 24,
            alignment: 'STRETCH',
            boundVariables: { gutterSize: alias('VariableID:grid') },
          },
        ],
        boundVariables: { layoutGrids: [alias('VariableID:grid')] },
      },
    ],
  };
  const varTable = {
    'VariableID:paint': { name: 'color/brand', resolvedType: 'COLOR' },
    'VariableID:text': { name: 'size/body', resolvedType: 'FLOAT' },
    'VariableID:effect-color': { name: 'color/information', resolvedType: 'COLOR' },
    'VariableID:effect-radius': {
      name: 'size/lg',
      resolvedType: 'FLOAT',
      codeSyntax: { WEB: '--size-lg' },
    },
    'VariableID:grid': { name: 'size/gutter', resolvedType: 'FLOAT' },
  };

  it('carries the binding on the object that owns it, per style category', async () => {
    const result = (await createGetStylesHandler(fakeFigma(boundStyles, varTable))(
      undefined,
    )) as GetStylesResult;

    const paints = result.paints[0]?.paints ?? [];
    expect(paints[0]).not.toHaveProperty('boundVariables');
    expect(paints[1]).toHaveProperty('boundVariables', { color: 'VariableID:paint' });
    expect(result.texts[0]?.boundVariables).toEqual({ fontSize: 'VariableID:text' });
    expect(result.effects[0]?.effects[0]?.boundVariables).toEqual({
      color: 'VariableID:effect-color',
      radius: 'VariableID:effect-radius',
    });
    expect(result.grids[0]?.grids[0]?.boundVariables).toEqual({ gutterSize: 'VariableID:grid' });
  });

  it('puts the variables table before the styles that cite it', async () => {
    const result = (await createGetStylesHandler(fakeFigma(boundStyles, varTable))(
      undefined,
    )) as GetStylesResult;
    expect(Object.keys(result)[0]).toBe('variables');
  });

  it('keys the variables table in a stable order, not in lookup-completion order', async () => {
    const slow = {
      'VariableID:paint': { name: 'color/brand', resolvedType: 'COLOR' },
      'VariableID:text': { name: 'size/body', resolvedType: 'FLOAT' },
      'VariableID:effect-color': { name: 'color/information', resolvedType: 'COLOR' },
      'VariableID:effect-radius': { name: 'size/lg', resolvedType: 'FLOAT' },
      'VariableID:grid': { name: 'size/gutter', resolvedType: 'FLOAT' },
    };
    const delays: Record<string, number> = {
      'VariableID:paint': 8,
      'VariableID:text': 6,
      'VariableID:effect-color': 4,
      'VariableID:effect-radius': 2,
      'VariableID:grid': 0,
    };
    const figmaCtx = {
      getLocalPaintStylesAsync: async () => boundStyles.paints,
      getLocalTextStylesAsync: async () => boundStyles.texts,
      getLocalEffectStylesAsync: async () => boundStyles.effects,
      getLocalGridStylesAsync: async () => boundStyles.grids,
      variables: {
        getVariableByIdAsync: async (id: string) => {
          await new Promise(r => setTimeout(r, delays[id] ?? 0));
          return slow[id as keyof typeof slow] ?? null;
        },
      },
    } as unknown as typeof figma;
    const result = (await createGetStylesHandler(figmaCtx)(undefined)) as GetStylesResult;
    expect(Object.keys(result.variables ?? {})).toEqual([
      'VariableID:paint',
      'VariableID:text',
      'VariableID:effect-color',
      'VariableID:effect-radius',
      'VariableID:grid',
    ]);
  });

  it('resolves every referenced id to a name, and only those', async () => {
    const result = (await createGetStylesHandler(fakeFigma(boundStyles, varTable))(
      undefined,
    )) as GetStylesResult;
    expect(result.variables).toEqual({
      'VariableID:paint': { name: 'color/brand', type: 'COLOR' },
      'VariableID:text': { name: 'size/body', type: 'FLOAT' },
      'VariableID:effect-color': { name: 'color/information', type: 'COLOR' },
      'VariableID:effect-radius': {
        name: 'size/lg',
        type: 'FLOAT',
        codeSyntax: { WEB: '--size-lg' },
      },
      'VariableID:grid': { name: 'size/gutter', type: 'FLOAT' },
    });
  });

  it('resolves ids referenced only by a gradient stop', async () => {
    const result = (await createGetStylesHandler(
      fakeFigma(
        {
          paints: [
            {
              id: 'S:1',
              name: 'Fade',
              key: 'k1',
              description: '',
              paints: [
                {
                  type: 'GRADIENT_LINEAR',
                  visible: true,
                  opacity: 1,
                  gradientTransform: [
                    [1, 0, 0],
                    [0, 1, 0],
                  ],
                  gradientStops: [
                    {
                      position: 0,
                      color: { r: 0, g: 0, b: 0, a: 1 },
                      boundVariables: { color: alias('VariableID:1') },
                    },
                  ],
                },
              ],
            },
          ],
        },
        { 'VariableID:1': { name: 'color/brand-stop', resolvedType: 'COLOR' } },
      ),
    )(undefined)) as GetStylesResult;
    expect(result.variables).toEqual({
      'VariableID:1': { name: 'color/brand-stop', type: 'COLOR' },
    });
  });

  it('omits the variables table when nothing is bound', async () => {
    const result = (await createGetStylesHandler(
      fakeFigma(
        {
          texts: [
            {
              id: 'S:2',
              name: 'Body',
              key: 'k2',
              description: '',
              fontName: { family: 'Inter', style: 'Regular' },
              fontSize: 16,
              lineHeight: { unit: 'AUTO' },
              letterSpacing: { unit: 'PIXELS', value: 0 },
              textWrapStyle: 'AUTO',
              boundVariables: {},
            },
          ],
        },
        varTable,
      ),
    )(undefined)) as GetStylesResult;
    expect(result).not.toHaveProperty('variables');
    expect(result.texts[0]).not.toHaveProperty('boundVariables');
  });

  it('keeps the styles when a bound variable no longer resolves', async () => {
    const result = (await createGetStylesHandler(fakeFigma(boundStyles, {}))(
      undefined,
    )) as GetStylesResult;
    expect(result.effects[0]?.effects[0]?.boundVariables).toEqual({
      color: 'VariableID:effect-color',
      radius: 'VariableID:effect-radius',
    });
    expect(result).not.toHaveProperty('variables');
  });

  it.each([
    ['DISPLAY_P3', true],
    ['SRGB', false],
  ] as const)('leads a %s document with the P3 marker: %s', async (profile, marked) => {
    const figmaCtx = fakeFigma();
    (figmaCtx as unknown as { root: object }).root = { documentColorProfile: profile };
    const result = (await createGetStylesHandler(figmaCtx)(undefined)) as object;
    expect(Object.keys(result)[0]).toBe(marked ? 'colorProfile' : 'paints');
    expect('colorProfile' in result).toBe(marked);
  });
});
