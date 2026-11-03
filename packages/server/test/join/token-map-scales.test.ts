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

describe('joinTokens', () => {
  describe('scale-step gating (B2)', () => {
    it('does not snap a different scale step in the same family to the one that exists', () => {
      const [m] = joinTokens([fig('Primary/50', '#F3F5FF')], tokens, { threshold: 0.7 });
      expect(m?.status).toBe('unmapped');
      expect(m?.candidate).toBeUndefined();
    });

    it('does not snap an arbitrary spacing value to the nearest defined step', () => {
      const spacing = [proj('spacing-2', '8px', '2', 'spacing')];
      const [m] = joinTokens([fig('spacing/24', 96, 'FLOAT')], spacing, { threshold: 0.7 });
      expect(m?.status).toBe('unmapped');
    });

    it('still matches when the scale step agrees', () => {
      const spacing = [proj('spacing-2', '8px', '2', 'spacing')];
      const [m] = joinTokens([fig('spacing/2', 8, 'FLOAT')], spacing, { threshold: 0.7 });
      expect(m?.candidate?.token).toBe('spacing-2');
      expect(m?.status).toBe('high');
    });
  });

  describe('Tailwind/Figma namespace synonyms (B3)', () => {
    it('matches Figma rounded/* to a Tailwind --radius-* token', () => {
      const radii = [proj('radius-lg', '0.5rem', 'lg', 'radius')];
      const [m] = joinTokens([fig('rounded/lg', 8, 'FLOAT')], radii, { threshold: 0.7 });
      expect(m?.candidate?.token).toBe('radius-lg');
      expect(m?.status).toBe('high');
    });

    it('does NOT alias size→text outside a typography collection (size/* is overloaded)', () => {
      const text = [proj('text-base', '1rem', 'base', 'font-size')];

      expect(
        joinTokens([fig('size/base', 16, 'FLOAT', 'size')], text, { threshold: 0.7 })[0]?.status,
      ).toBe('unmapped');
      expect(joinTokens([fig('size/base', 16, 'FLOAT')], text, { threshold: 0.7 })[0]?.status).toBe(
        'unmapped',
      );
    });

    it('aliases size→text when the Figma variable is in a typography collection', () => {
      const text = [proj('text-base', '1rem', 'base', 'font-size')];
      const [m] = joinTokens([fig('size/base', 16, 'FLOAT', 'font')], text, { threshold: 0.7 });
      expect(m?.candidate?.token).toBe('text-base');
      expect(m?.status).toBe('high');
    });

    it('opens size→text on FONT_SIZE scope even when the collection name says nothing', () => {
      const text = [proj('text-base', '1rem', 'base', 'font-size')];
      const [m] = joinTokens([fig('size/base', 16, 'FLOAT', 'Primitives', ['FONT_SIZE'])], text, {
        threshold: 0.7,
      });
      expect(m?.candidate?.token).toBe('text-base');
      expect(m?.status).toBe('high');
    });

    it('closes size→text on a non-font scope even inside a typography collection', () => {
      const text = [proj('text-base', '1rem', 'base', 'font-size')];
      const [m] = joinTokens([fig('size/base', 16, 'FLOAT', 'font', ['WIDTH_HEIGHT'])], text, {
        threshold: 0.7,
      });
      expect(m?.status).toBe('unmapped');
      expect(m?.candidate).toBeUndefined();
    });

    it('reads FONT_SIZE among several scopes as a font size', () => {
      const text = [proj('text-base', '1rem', 'base', 'font-size')];
      const [m] = joinTokens(
        [fig('size/base', 16, 'FLOAT', 'Primitives', ['FONT_SIZE', 'LINE_HEIGHT'])],
        text,
        { threshold: 0.7 },
      );
      expect(m?.candidate?.token).toBe('text-base');
    });

    it('falls back to the collection heuristic when no scopes are declared', () => {
      const text = [proj('text-base', '1rem', 'base', 'font-size')];
      expect(
        joinTokens([fig('size/base', 16, 'FLOAT', 'font')], text, { threshold: 0.7 })[0]?.candidate
          ?.token,
      ).toBe('text-base');
      expect(
        joinTokens([fig('size/base', 16, 'FLOAT', 'Primitives')], text, { threshold: 0.7 })[0]
          ?.status,
      ).toBe('unmapped');
    });

    it('still gates on the step: rounded/md does not match radius-lg', () => {
      const radii = [proj('radius-lg', '0.5rem', 'lg', 'radius')];
      const [m] = joinTokens([fig('rounded/md', 6, 'FLOAT')], radii, { threshold: 0.7 });
      expect(m?.status).toBe('unmapped');
    });
  });

  describe('Tailwind framework built-in scale fallback (B1)', () => {
    it('flags a numeric spacing/N as framework-builtin (not a false gap) on a Tailwind project', () => {
      const [m] = joinTokens([fig('spacing/4', 16, 'FLOAT')], tokens, {
        threshold: 0.7,
        utilityFirst: true,
      });
      expect(m?.status).toBe('framework-builtin');
      expect(m?.builtin).toEqual({ scale: 'spacing', step: '4' });
      expect(m?.candidate).toBeUndefined();
    });

    it('recognizes Figma dash-written half-steps (spacing/1-5 → 1.5) and the px step', () => {
      const half = joinTokens([fig('spacing/1-5', 6, 'FLOAT')], tokens, {
        threshold: 0.7,
        utilityFirst: true,
      })[0];
      expect(half?.status).toBe('framework-builtin');
      expect(half?.builtin?.step).toBe('1.5');

      const px = joinTokens([fig('spacing/px', 1, 'FLOAT')], tokens, {
        threshold: 0.7,
        utilityFirst: true,
      })[0];
      expect(px?.status).toBe('framework-builtin');
      expect(px?.builtin?.step).toBe('px');
    });

    it('NEVER overrides a real project match: declared spacing-4 wins as high (guarantee 1)', () => {
      const spacing = [proj('spacing-4', '16px', '4', 'spacing')];
      const [m] = joinTokens([fig('spacing/4', 16, 'FLOAT')], spacing, {
        threshold: 0.7,
        utilityFirst: true,
      });
      expect(m?.status).toBe('high');
      expect(m?.candidate?.token).toBe('spacing-4');
      expect(m?.builtin).toBeUndefined();
    });

    it('recognizes line-height/N as a framework-builtin (leading-N), despite the dash in the stem', () => {
      const [m] = joinTokens([fig('line-height/7', 28, 'FLOAT')], tokens, {
        threshold: 0.7,
        utilityFirst: true,
      });
      expect(m?.status).toBe('framework-builtin');
      expect(m?.builtin).toEqual({ scale: 'line-height', step: '7' });
    });

    it('maps weight/* to a font-weight built-in, renaming Regular → normal', () => {
      const bold = joinTokens([fig('weight/Bold', 'Bold', 'STRING')], tokens, {
        threshold: 0.7,
        utilityFirst: true,
      })[0];
      expect(bold?.status).toBe('framework-builtin');
      expect(bold?.builtin).toEqual({ scale: 'font-weight', step: 'bold' });

      const regular = joinTokens([fig('weight/Regular', 'Regular', 'STRING')], tokens, {
        threshold: 0.7,
        utilityFirst: true,
      })[0];
      expect(regular?.builtin).toEqual({ scale: 'font-weight', step: 'normal' });

      const semi = joinTokens([fig('weight/Semi Bold', 'Semi Bold', 'STRING')], tokens, {
        threshold: 0.7,
        utilityFirst: true,
      })[0];
      expect(semi?.builtin?.step).toBe('semibold');
    });

    it('leaves an unknown weight name unmapped (conservative)', () => {
      const [m] = joinTokens([fig('weight/Condensed', 'Condensed', 'STRING')], tokens, {
        threshold: 0.7,
        utilityFirst: true,
      });
      expect(m?.status).toBe('unmapped');
    });

    it('does not fire on a non-Tailwind project (flag off) — stays unmapped', () => {
      const [m] = joinTokens([fig('spacing/4', 16, 'FLOAT')], tokens, { threshold: 0.7 });
      expect(m?.status).toBe('unmapped');
      expect(m?.builtin).toBeUndefined();
    });

    it('only blesses unambiguous namespaces: non-numeric spacing and size/* stay unmapped (guarantee 2)', () => {
      expect(
        joinTokens([fig('spacing/banner', 16, 'FLOAT')], tokens, {
          threshold: 0.7,
          utilityFirst: true,
        })[0]?.status,
      ).toBe('unmapped');

      expect(
        joinTokens([fig('size/68', 68, 'FLOAT')], tokens, { threshold: 0.7, utilityFirst: true })[0]
          ?.status,
      ).toBe('unmapped');
    });
  });

  it('carries figmaModes through the join untouched (theme-dependent token)', () => {
    const themed: FigmaToken = {
      ...fig('bg/surface', '#FFFFFF'),
      modes: { Light: '#FFFFFF', Dark: '#0A0A0A' },
    };
    const [m] = joinTokens([themed], [proj('color-surface', '#FFFFFF', 'surface', 'color')], {
      threshold: 0.7,
      utilityFirst: true,
    });

    expect(m?.candidate?.token).toBe('color-surface');
    expect(m?.figmaModes).toEqual({ Light: '#FFFFFF', Dark: '#0A0A0A' });
  });

  it('leaves figmaModes absent for a single-mode token', () => {
    const [m] = joinTokens([fig('Primary/500', '#6266F0')], tokens, { threshold: 0.7 });
    expect(m?.figmaModes).toBeUndefined();
  });

  it('caps confidence when the name matches but a known color value disagrees (B1)', () => {
    const greys = [proj('color-grey-100', '#EEEEEE', 'grey-100', 'color')];
    const [m] = joinTokens([fig('Grey/100', '#F5F5F5')], greys, { threshold: 0.7 });
    expect(m?.candidate?.token).toBe('color-grey-100');
    expect(m?.candidate?.matchedBy).toEqual(['name']);
    expect(m?.candidate?.confidence).toBeLessThan(0.85);
    expect(m?.status).not.toBe('high');
  });
});
