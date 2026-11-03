import { describe, expect, it } from 'vitest';

import { joinTokens } from '../../src/join/token-map.js';
import type { FigmaToken } from '../../src/tokens/figma-tokens.js';
import type { ProjectToken } from '../../src/tokens/project-token.js';

const fig = (
  name: string,
  value: FigmaToken['value'],
  type = 'COLOR',
  collection?: string,
  scopes?: readonly string[],
): FigmaToken => ({
  name,
  value,
  type,
  ...(collection === undefined ? {} : { collection }),
  ...(scopes === undefined ? {} : { scopes }),
});

const proj = (name: string, value: string, utility?: string, category?: string): ProjectToken => ({
  name,
  value,
  cssVar: `var(--${name})`,
  ...(utility === undefined ? {} : { utility, utilityIsClass: true }),
  ...(category === undefined ? {} : { category }),
});

const tokens: ProjectToken[] = [
  proj('color-primary-500', '#6266F0', 'primary-500', 'color'),
  proj('color-grey-900', '#111827', 'grey-900', 'color'),
  proj('radius-lg', '0.5rem', 'lg', 'radius'),
];

describe('joinTokens — same-value siblings (value-match ambiguity)', () => {
  const whites: ProjectToken[] = [
    proj('color-white', '#FFFFFF', 'white', 'color'),
    proj('color-background', '#FFFFFF', 'background', 'color'),
    proj('color-card', '#FFFFFF', 'card', 'color'),
  ];

  it('lets the name pick the winner among same-value tokens', () => {
    const [m] = joinTokens([fig('Colors/Card', '#FFFFFF')], whites, { threshold: 0.7 });
    expect(m?.candidate?.token).toBe('color-card');
    expect(m?.candidate?.matchedBy).toEqual(['name', 'value']);
    expect(m?.candidate?.ambiguousWith).toBeUndefined();
    expect(m?.status).toBe('high');
  });

  it('caps below high and lists the siblings when the name carries no signal', () => {
    const [m] = joinTokens([fig('Brand/Snow', '#FFFFFF')], whites, { threshold: 0.7 });
    expect(m?.candidate).toBeDefined();
    expect(m?.candidate?.matchedBy).toEqual(['value']);
    expect(m?.candidate?.confidence).toBeLessThan(0.85);
    expect(m?.status).toBe('medium');

    const names = [m?.candidate?.token, ...(m?.candidate?.ambiguousWith ?? [])].toSorted((a, b) =>
      String(a).localeCompare(String(b)),
    );
    expect(names).toEqual(['color-background', 'color-card', 'color-white']);
  });

  it('is deterministic regardless of project token order', () => {
    const [a] = joinTokens([fig('Brand/Snow', '#FFFFFF')], whites, { threshold: 0.7 });
    const [b] = joinTokens([fig('Brand/Snow', '#FFFFFF')], whites.toReversed(), {
      threshold: 0.7,
    });
    expect(a?.candidate?.token).toBe(b?.candidate?.token);
    expect(a?.candidate?.ambiguousWith).toEqual(b?.candidate?.ambiguousWith);
  });

  it('treats a name-score tie among siblings as ambiguous, not a confident pick', () => {
    const tied = [proj('color-brand', '#123456'), proj('brand-color', '#123456')];
    const [m] = joinTokens([fig('brand', '#123456')], tied, { threshold: 0.7 });
    expect(m?.candidate?.ambiguousWith).toHaveLength(1);
    expect(m?.status).not.toBe('high');
  });

  it('keeps the unique value-match at 0.9 high (unchanged behaviour)', () => {
    const unique = [proj('color-primary-500', '#6266F0', 'primary-500', 'color')];
    const [m] = joinTokens([fig('Brand/Indigo', '#6266F0')], unique, { threshold: 0.7 });
    expect(m?.candidate?.token).toBe('color-primary-500');
    expect(m?.candidate?.matchedBy).toEqual(['value']);
    expect(m?.candidate?.confidence).toBe(0.9);
    expect(m?.candidate?.ambiguousWith).toBeUndefined();
    expect(m?.status).toBe('high');
  });
});

describe('joinTokens — map-file overrides (write-back loop)', () => {
  it('an override wins as high with matchedBy map-file when its ref resolves', () => {
    const overrides = new Map([['Brand/Accent', 'primary-500']]);
    for (const ref of ['primary-500', 'var(--color-primary-500)', 'color-primary-500']) {
      const [m] = joinTokens([fig('Brand/Accent', '#123456')], tokens, {
        threshold: 0.7,
        utilityFirst: true,
        overrides: new Map([...overrides, ['Brand/Accent', ref]]),
      });
      expect(m?.candidate?.token).toBe('color-primary-500');
      expect(m?.candidate?.confidence).toBe(1);
      expect(m?.candidate?.matchedBy).toEqual(['map-file']);
      expect(m?.status).toBe('high');
      expect(m?.staleOverride).toBeUndefined();
    }
  });

  it('degrades a stale override (ref no longer resolves) to the normal join and flags it', () => {
    const overrides = new Map([['Primary/500', 'color-deleted-500']]);
    const [m] = joinTokens([fig('Primary/500', '#6266F0')], tokens, {
      threshold: 0.7,
      utilityFirst: true,
      overrides,
    });
    expect(m?.candidate?.token).toBe('color-primary-500');
    expect(m?.candidate?.matchedBy).not.toContain('map-file');
    expect(m?.staleOverride).toEqual({ ref: 'color-deleted-500' });
    expect(m?.status).toBe('high');
  });
});
