import type { GetStylesResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { resolvePaintStyleTokens } from '../../src/tokens/figma-tokens.js';

describe('resolvePaintStyleTokens', () => {
  const paint = (
    name: string,
    paints: GetStylesResult['paints'][number]['paints'],
  ): GetStylesResult['paints'][number] => ({
    id: `S:${name}`,
    name,
    key: 'k',
    description: '',
    paints,
  });

  const solid = (r: number, g: number, b: number, over: Record<string, unknown> = {}) => ({
    type: 'SOLID' as const,
    visible: true,
    opacity: 1,
    color: { r, g, b },
    ...over,
  });

  it('converts a single visible SOLID paint style into a COLOR pseudo-token marked style', () => {
    const [t] = resolvePaintStyleTokens([paint('Primary/500', [solid(0.384, 0.4, 0.941)])]);
    expect(t).toEqual({ name: 'Primary/500', value: '#6266F0', type: 'COLOR', source: 'style' });
  });

  it('folds a semi-transparent solid into an 8-digit hex', () => {
    const [t] = resolvePaintStyleTokens([paint('Overlay', [solid(0, 0, 0, { opacity: 0.25 })])]);
    expect(t?.value).toBe('#00000040');
  });

  it('skips gradient, image, multi-paint, and invisible-only styles', () => {
    const gradient = {
      type: 'GRADIENT_LINEAR' as const,
      visible: true,
      opacity: 1,
      gradientStops: [],
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
    };
    const tokens = resolvePaintStyleTokens([
      paint('Hero/Gradient', [gradient]),
      paint('Card/Layered', [solid(1, 1, 1), solid(0, 0, 0)]),
      paint('Hidden', [solid(1, 0, 0, { visible: false })]),
    ]);
    expect(tokens).toEqual([]);
  });

  it('ignores an invisible extra paint when exactly one visible SOLID remains', () => {
    const tokens = resolvePaintStyleTokens([
      paint('Brand/Red', [solid(0.5, 0, 0, { visible: false }), solid(0.902, 0.141, 0.165)]),
    ]);
    expect(tokens[0]?.name).toBe('Brand/Red');
    expect(tokens[0]?.value).toBe('#E6242A');
  });
});
