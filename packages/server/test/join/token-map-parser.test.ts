import { describe, expect, it } from 'vitest';

import { joinTokens, parseTokenMapFile } from '../../src/join/token-map.js';
import type { FigmaToken } from '../../src/tokens/figma-tokens.js';
import { parseCssCustomProperties } from '../../src/tokens/stylesheet/css-custom-properties.js';

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

describe('parseTokenMapFile', () => {
  it('parses table rows and arrow lines, skipping the header, keying raw + normalized', () => {
    const map = parseTokenMapFile(
      [
        '| Figma | Token |',
        '| --- | --- |',
        '| Brand/Primary | bg-primary-500 |',
        'Accent/Teal -> var(--color-teal)',
      ].join('\n'),
    );
    expect(map.get('Brand/Primary')).toBe('bg-primary-500');
    expect(map.get('brandprimary')).toBe('bg-primary-500');
    expect(map.get('Accent/Teal')).toBe('var(--color-teal)');
    expect(map.has('Figma')).toBe(false);
  });

  it('does not mistake a data row for the header (whole-cell header match)', () => {
    const map = parseTokenMapFile(
      ['| Figma | Ref |', '| :--- | ---: |', '| Figma/Brand | brand-value |'].join('\n'),
    );
    expect(map.get('Figma/Brand')).toBe('brand-value');
    expect(map.has('Figma')).toBe(false);
    expect([...map.keys()].some(k => k.startsWith(':'))).toBe(false);
  });

  it('keys non-Latin names without collapsing them onto one another', () => {
    const map = parseTokenMapFile(
      [
        '| Figma | Token |',
        '| --- | --- |',
        '| 顏色/主要 | --color-primary |',
        '| 顏色/次要 | --color-secondary |',
        '| 顏色/危險 | --color-danger |',
      ].join('\n'),
    );
    expect(map.get('顏色/主要')).toBe('--color-primary');
    expect(map.get('顏色主要')).toBe('--color-primary');
    expect(map.get('顏色次要')).toBe('--color-secondary');
    expect(map.get('顏色危險')).toBe('--color-danger');
    expect(map.has('')).toBe(false);
  });
});

describe('joinTokens — themed stylesheets (both scopes reachable)', () => {
  const themed = parseCssCustomProperties(`
    :root { --color-surface: #FFFFFF; --color-ink: #111111; }
    .dark { --color-surface: #0B0B0B; --color-ink: #F5F5F5; }
  `);

  it('value-matches the light value', () => {
    const [m] = joinTokens([fig('Color/Surface', '#FFFFFF')], themed, { threshold: 0.7 });
    expect(m?.candidate?.token).toBe('color-surface');
    expect(m?.candidate?.matchedBy).toEqual(['name', 'value']);
    expect(m?.status).toBe('high');
  });

  it('value-matches the dark override of the same token', () => {
    const [m] = joinTokens([fig('Color/Surface', '#0B0B0B')], themed, { threshold: 0.7 });
    expect(m?.candidate?.token).toBe('color-surface');
    expect(m?.candidate?.matchedBy).toEqual(['name', 'value']);
    expect(m?.status).toBe('high');
  });

  it('does not report a token as ambiguous with itself', () => {
    const [m] = joinTokens([fig('Color/Ink', '#111111')], themed, { threshold: 0.7 });
    expect(m?.candidate?.ambiguousWith).toBeUndefined();
    expect(m?.candidate?.confidence).toBe(1);
  });

  it('leads with the base value when only the name matches', () => {
    const [m] = joinTokens([fig('Color/Surface', 'not-a-hex')], themed, { threshold: 0.7 });
    expect(m?.candidate?.cssVar).toBe('var(--color-surface)');
    expect(m?.candidate?.matchedBy).toEqual(['name']);
  });
});
