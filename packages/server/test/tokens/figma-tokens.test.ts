import type { GetVariableDefsResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { resolveFigmaTokens } from '../../src/tokens/figma-tokens.js';

const defs = (over: Partial<GetVariableDefsResult> = {}): GetVariableDefsResult => ({
  collections: [
    {
      id: 'col1',
      name: 'Tokens',
      key: 'k',
      defaultModeId: 'm1',
      modes: [{ modeId: 'm1', name: 'Default' }],
      variableIds: [],
    },
  ],
  variables: [],
  ...over,
});

describe('resolveFigmaTokens', () => {
  it('renders COLOR variables as hex from the default mode', () => {
    const result = resolveFigmaTokens(
      defs({
        variables: [
          {
            id: 'v1',
            name: 'Primary/500',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',
            valuesByMode: { m1: { r: 0.384, g: 0.4, b: 0.941, a: 1 } },
          },
        ],
      }),
    );
    expect(result[0]).toMatchObject({ name: 'Primary/500', type: 'COLOR' });
    expect(result[0]?.value).toBe('#6266F0');
    expect(result[0]?.collection).toBe('Tokens');
  });

  it('flattens EASING variables to a scalar token value', () => {
    const mkVar = (id: string, value: unknown): GetVariableDefsResult['variables'][number] =>
      ({
        id,
        name: `motion/${id}`,
        key: `k${id}`,
        resolvedType: 'EASING',
        collectionId: 'col1',
        valuesByMode: { m1: value },
      }) as GetVariableDefsResult['variables'][number];

    const result = resolveFigmaTokens(
      defs({
        variables: [
          mkVar('preset', { type: 'EASE_IN_AND_OUT' }),
          mkVar('bez', {
            type: 'CUSTOM_CUBIC_BEZIER',
            easingFunctionCubicBezier: { x1: 0.2, y1: 0, x2: 0.8, y2: 1 },
          }),
          mkVar('spring', { type: 'CUSTOM_SPRING', easingFunctionSpring: { bounce: 0.4 } }),
        ],
      }),
    );

    expect(result[0]).toMatchObject({ type: 'EASING', value: 'EASE_IN_AND_OUT' });

    expect(result[1]?.value).toBe('cubic-bezier(0.2, 0, 0.8, 1)');

    expect(result[2]?.value).toBe('spring(0.4)');
  });

  it('keeps FLOAT / STRING / BOOLEAN values as-is', () => {
    const result = resolveFigmaTokens(
      defs({
        variables: [
          {
            id: 'f',
            name: 'spacing/2',
            key: 'k',
            resolvedType: 'FLOAT',
            collectionId: 'col1',
            valuesByMode: { m1: 8 },
          },
          {
            id: 's',
            name: 'font/family',
            key: 'k',
            resolvedType: 'STRING',
            collectionId: 'col1',
            valuesByMode: { m1: 'Inter' },
          },
        ],
      }),
    );
    expect(result.find(t => t.name === 'spacing/2')?.value).toBe(8);
    expect(result.find(t => t.name === 'font/family')?.value).toBe('Inter');
  });

  it('follows alias chains to the concrete value', () => {
    const result = resolveFigmaTokens(
      defs({
        variables: [
          {
            id: 'base',
            name: 'palette/indigo',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',
            valuesByMode: { m1: { r: 0.384, g: 0.4, b: 0.941, a: 1 } },
          },
          {
            id: 'alias',
            name: 'Primary/500',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',
            valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'base' } },
          },
        ],
      }),
    );
    expect(result.find(t => t.name === 'Primary/500')?.value).toBe('#6266F0');
  });

  it('flattens a composed color to one hex, resolving each half independently', () => {
    const base = {
      id: 'base',
      name: 'palette/indigo',
      key: 'k',
      resolvedType: 'COLOR',
      collectionId: 'col1',
      valuesByMode: { m1: { r: 0.384, g: 0.4, b: 0.941, a: 1 } },
    };
    const half = {
      id: 'half',
      name: 'opacity/half',
      key: 'k',
      resolvedType: 'FLOAT',
      collectionId: 'col1',
      valuesByMode: { m1: 50 },
    };
    const result = resolveFigmaTokens(
      defs({
        variables: [
          base,
          half,
          {
            id: 'both',
            name: 'Overlay/both',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',

            valuesByMode: {
              m1: {
                color: { type: 'VARIABLE_ALIAS', id: 'base' },
                opacity: { type: 'VARIABLE_ALIAS', id: 'half' },
              },
            },
          },
          {
            id: 'literal',
            name: 'Overlay/literal',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',

            valuesByMode: {
              m1: {
                color: { r: 1, g: 1, b: 1, a: 1 },
                opacity: { type: 'VARIABLE_ALIAS', id: 'half' },
              },
            },
          },
          {
            id: 'dangling',
            name: 'Overlay/dangling',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',
            valuesByMode: {
              m1: { color: { type: 'VARIABLE_ALIAS', id: 'gone' }, opacity: 50 },
            },
          },
        ],
      }),
    );

    expect(result.find(t => t.name === 'Overlay/both')?.value).toBe('#6266F080');
    expect(result.find(t => t.name === 'Overlay/literal')?.value).toBe('#FFFFFF80');

    expect(result.find(t => t.name === 'Overlay/dangling')?.value).toBeNull();
  });

  it('replaces the base colour own alpha rather than multiplying with it', () => {
    const result = resolveFigmaTokens(
      defs({
        variables: [
          {
            id: 'base',
            name: 'palette/translucent',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',
            valuesByMode: { m1: { r: 1, g: 0, b: 0, a: 0.8 } },
          },
          {
            id: 'over',
            name: 'Overlay/half',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',
            valuesByMode: {
              m1: { color: { type: 'VARIABLE_ALIAS', id: 'base' }, opacity: 50 },
            },
          },
        ],
      }),
    );

    expect(result.find(t => t.name === 'palette/translucent')?.value).toBe('#FF0000CC');
    expect(result.find(t => t.name === 'Overlay/half')?.value).toBe('#FF000080');
  });

  it('reads a composed color opacity as a percentage, not as a 0–1 alpha', () => {
    const result = resolveFigmaTokens(
      defs({
        variables: [
          {
            id: 'black',
            name: 'palette/black',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',
            valuesByMode: { m1: { r: 0, g: 0, b: 0, a: 1 } },
          },
          {
            id: 'scrim',
            name: 'Overlay/scrim',
            key: 'k',
            resolvedType: 'COLOR',
            collectionId: 'col1',
            valuesByMode: {
              m1: { color: { type: 'VARIABLE_ALIAS', id: 'black' }, opacity: 12 },
            },
          },
        ],
      }),
    );

    expect(result.find(t => t.name === 'Overlay/scrim')?.value).toBe('#0000001F');
  });

  it('carries scopes through onto the resolved token, and omits them when absent', () => {
    const result = resolveFigmaTokens(
      defs({
        variables: [
          {
            id: 'scoped',
            name: 'size/lg',
            key: 'k',
            resolvedType: 'FLOAT',
            collectionId: 'col1',
            valuesByMode: { m1: 18 },
            scopes: ['FONT_SIZE'],
          },
          {
            id: 'bare',
            name: 'size/md',
            key: 'k',
            resolvedType: 'FLOAT',
            collectionId: 'col1',
            valuesByMode: { m1: 16 },
          },
        ],
      }),
    );

    expect(result.find(t => t.name === 'size/lg')?.scopes).toEqual(['FONT_SIZE']);
    expect(result.find(t => t.name === 'size/md')).not.toHaveProperty('scopes');
  });
});
