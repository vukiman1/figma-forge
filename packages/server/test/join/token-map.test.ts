import { describe, expect, it } from 'vitest';

import { joinTokens, parseTokenMapFile } from '../../src/join/token-map.js';
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
  it('matches by name + value as high confidence, recommending the Tailwind utility', () => {
    const [m] = joinTokens([fig('Primary/500', '#6266F0')], tokens, {
      threshold: 0.7,
      utilityFirst: true,
    });
    expect(m?.candidate?.token).toBe('color-primary-500');
    expect(m?.candidate?.ref).toBe('primary-500');
    expect(m?.candidate?.cssVar).toBe('var(--color-primary-500)');
    expect(m?.candidate?.matchedBy).toEqual(['name', 'value']);
    expect(m?.candidate?.confidence).toBe(1);
    expect(m?.status).toBe('high');
  });

  it('carries the declaring file of a SCSS token, without which the ref cannot resolve', () => {
    const scss: ProjectToken[] = [
      {
        name: 'color-primary-500',
        value: '#6266F0',
        scssVar: '$color-primary-500',
        from: 'src/styles/_tokens.scss',
      },
    ];
    const [m] = joinTokens([fig('Primary/500', '#6266F0')], scss, { threshold: 0.7 });
    expect(m?.candidate?.ref).toBe('$color-primary-500');

    expect(m?.candidate?.from).toBe('src/styles/_tokens.scss');

    expect(m?.candidate?.utility).toBeUndefined();
    expect(m?.candidate?.cssVar).toBeUndefined();
  });

  it('points `from` at the file whose token actually matched, not the first seen', () => {
    const perComponent: ProjectToken[] = [
      { name: 'primary', value: '#6266F0', scssVar: '$primary', from: 'src/_a.scss' },
      { name: 'primary', value: '#FF0000', scssVar: '$primary', from: 'src/_b.scss' },
    ];
    const [m] = joinTokens([fig('Primary', '#FF0000')], perComponent, { threshold: 0.7 });
    expect(m?.candidate?.from).toBe('src/_b.scss');
  });

  it('caps a name-only match that cannot say which file declared the name', () => {
    const twoFiles: ProjectToken[] = [
      { name: 'radius-lg', value: '4px', scssVar: '$radius-lg', from: 'src/_a.scss' },
      { name: 'radius-lg', value: '8px', scssVar: '$radius-lg', from: 'src/_b.scss' },
    ];
    const [m] = joinTokens([fig('radius/lg', 8, 'FLOAT')], twoFiles, { threshold: 0.7 });
    expect(m?.candidate?.confidence).toBeLessThan(1);
    expect(m?.status).not.toBe('high');
  });

  it('does not cap a name-only match because a pooled custom property has no file', () => {
    const mixed: ProjectToken[] = [
      { name: 'radius-lg', value: '8px', scssVar: '$radius-lg', from: 'src/_t.scss' },
      { name: 'radius-lg', value: '8px', cssVar: 'var(--radius-lg)' },
    ];
    const [m] = joinTokens([fig('radius/lg', 8, 'FLOAT')], mixed, { threshold: 0.7 });
    expect(m?.status).toBe('high');
  });

  it('does not cap a name-only match when one file declares the name', () => {
    const oneFile: ProjectToken[] = [
      { name: 'radius-lg', value: '8px', scssVar: '$radius-lg', from: 'src/_a.scss' },
    ];
    const [m] = joinTokens([fig('radius/lg', 8, 'FLOAT')], oneFile, { threshold: 0.7 });
    expect(m?.status).toBe('high');
  });

  it('does not list a same-named sibling as an alternative to choose between', () => {
    const twoFiles: ProjectToken[] = [
      { name: 'primary', value: '#6266F0', scssVar: '$primary', from: 'a/_t.scss' },
      { name: 'primary', value: '#6266F0', scssVar: '$primary', from: 'b/_t.scss' },
    ];
    const [m] = joinTokens([fig('primary', '#6266F0')], twoFiles, { threshold: 0.7 });
    expect(m?.candidate?.ambiguousWith).toBeUndefined();
    expect(m?.status).not.toBe('high');
  });

  it('says which other files caused a cap, on every path that caps', () => {
    const twoFiles: ProjectToken[] = [
      { name: 'primary', value: '#6266F0', scssVar: '$primary', from: 'a/_t.scss' },
      { name: 'primary', value: '#6266F0', scssVar: '$primary', from: 'b/_t.scss' },
    ];

    const [byValue] = joinTokens([fig('primary', '#6266F0')], twoFiles, { threshold: 0.7 });
    expect(byValue?.candidate?.ambiguousFrom).toEqual(['b/_t.scss']);

    const [byName] = joinTokens([fig('primary', 8, 'FLOAT')], twoFiles, { threshold: 0.7 });
    expect(byName?.candidate?.ambiguousFrom).toEqual(['b/_t.scss']);

    const overrides = parseTokenMapFile('| Accent | $primary |');
    const [byMap] = joinTokens([fig('Accent', '#123456')], twoFiles, { threshold: 0.7, overrides });
    expect(byMap?.candidate?.ambiguousFrom).toEqual(['b/_t.scss']);
  });

  it('caps a map-file override that cannot say which file it meant', () => {
    const twoFiles: ProjectToken[] = [
      { name: 'primary', value: '#6266F0', scssVar: '$primary', from: 'a/_t.scss' },
      { name: 'primary', value: '#6266F0', scssVar: '$primary', from: 'b/_t.scss' },
    ];
    const overrides = parseTokenMapFile('| Accent | $primary |');
    const [m] = joinTokens([fig('Accent', '#123456')], twoFiles, { threshold: 0.7, overrides });
    expect(m?.status).not.toBe('high');

    const [one] = joinTokens([fig('Accent', '#123456')], [twoFiles[0] as ProjectToken], {
      threshold: 0.7,
      overrides,
    });
    expect(one?.status).toBe('high');
  });

  it('resolves a map-file override against a SCSS variable, with or without the sigil', () => {
    const scssOnly: ProjectToken[] = [
      { name: 'brand-blue', value: '#6266F0', scssVar: '$brand-blue', from: 'src/_t.scss' },
    ];
    for (const ref of ['$brand-blue', 'brand-blue']) {
      const overrides = parseTokenMapFile(`| Accent/Blue | ${ref} |`);
      const [m] = joinTokens([fig('Accent/Blue', '#123456')], scssOnly, {
        threshold: 0.7,
        overrides,
      });
      expect(m?.candidate?.matchedBy).toEqual(['map-file']);

      expect(m?.candidate?.from).toBe('src/_t.scss');
      expect(m?.staleOverride).toBeUndefined();
    }
  });

  it('recommends the var() reference (not a bogus utility) on a non-Tailwind project', () => {
    const [m] = joinTokens([fig('Primary/500', '#6266F0')], tokens, { threshold: 0.7 });
    expect(m?.candidate?.token).toBe('color-primary-500');
    expect(m?.candidate?.ref).toBe('var(--color-primary-500)');
    expect(m?.candidate?.cssVar).toBe('var(--color-primary-500)');
    expect(m?.candidate?.utility).toBeUndefined();
    expect(m?.status).toBe('high');
  });

  it('uses an exact color value-match even when the name differs', () => {
    const [m] = joinTokens([fig('Brand/Indigo', '#6266F0')], tokens, { threshold: 0.7 });
    expect(m?.candidate?.token).toBe('color-primary-500');
    expect(m?.candidate?.matchedBy).toEqual(['value']);
    expect(m?.candidate?.confidence).toBe(0.9);
    expect(m?.status).toBe('high');
  });

  it('falls back to name-match when values are not comparable (e.g. oklch project token)', () => {
    const oklch = [proj('color-primary-500', 'oklch(0.6 0.2 270)', 'primary-500', 'color')];
    const [m] = joinTokens([fig('Primary/500', '#6266F0')], oklch, { threshold: 0.7 });
    expect(m?.candidate?.token).toBe('color-primary-500');
    expect(m?.candidate?.matchedBy).toEqual(['name']);
    expect(m?.status).toBe('high');
  });

  it('normalizes hex shorthand and a fully-opaque alpha before comparing', () => {
    const [m] = joinTokens([fig('White', '#FFFFFFFF')], [proj('color-white', '#fff', 'white')], {
      threshold: 0.7,
    });
    expect(m?.candidate?.token).toBe('color-white');
    expect(m?.candidate?.matchedBy).toContain('value');
  });

  it('flags unmapped when neither name nor value match', () => {
    const [m] = joinTokens([fig('Accent/Teal', '#14B8A6')], tokens, { threshold: 0.7 });
    expect(m?.status).toBe('unmapped');
    expect(m?.candidate).toBeUndefined();
  });
});
