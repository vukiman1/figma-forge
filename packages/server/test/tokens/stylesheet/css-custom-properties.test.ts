import { describe, expect, it } from 'vitest';

import { parseCssCustomProperties } from '../../../src/tokens/stylesheet/css-custom-properties.js';

describe('parseCssCustomProperties', () => {
  it('derives the utility base and category of a Tailwind v4 @theme token from its namespace', () => {
    const css = `@theme {
      --color-primary-500: #6266F0;
      --radius-lg: 0.5rem;
    }`;
    const tokens = parseCssCustomProperties(css);
    expect(tokens.find(t => t.name === 'color-primary-500')).toMatchObject({
      value: '#6266F0',
      cssVar: 'var(--color-primary-500)',
      utility: 'primary-500',
      category: 'color',
    });
    expect(tokens.find(t => t.name === 'radius-lg')?.utility).toBe('lg');
  });

  it('matches the font-weight- namespace before the shorter font- one', () => {
    const [token] = parseCssCustomProperties('@theme { --font-weight-bold: 700; }');
    expect(token?.category).toBe('font-weight');
  });

  it('parses plain :root CSS vars with no utility or category', () => {
    const tokens = parseCssCustomProperties(':root { --primary-500: #6266F0; --gap: 8px; }');
    const token = tokens.find(x => x.name === 'primary-500');
    expect(token?.cssVar).toBe('var(--primary-500)');
    expect(token?.utility).toBeUndefined();
    expect(token?.category).toBeUndefined();
  });

  it('ignores commented-out declarations', () => {
    const css = `:root { --color-x: #111; }
      /* --color-x: #999; should be ignored (commented) */`;
    const tokens = parseCssCustomProperties(css).filter(t => t.name === 'color-x');
    expect(tokens.map(t => t.value)).toEqual(['#111']);
  });

  it('keeps every distinct value of a repeated name so a light theme stays matchable after a dark one, @theme leading', () => {
    const css = `:root { --color-x: #111; }
      @theme { --color-x: #222; }`;
    const tokens = parseCssCustomProperties(css).filter(t => t.name === 'color-x');
    expect(tokens.map(t => t.value)).toEqual(['#222', '#111']);
  });

  it('leads with the base :root value, keeping class and @media-nested :root overrides in document order', () => {
    const css = `:root { --bg: #FFFFFF; }
      .dark { --bg: #000000; }
      @media (prefers-color-scheme: dark) { :root { --bg: #010101; } }`;
    const tokens = parseCssCustomProperties(css).filter(t => t.name === 'bg');
    expect(tokens.map(t => t.value)).toEqual(['#FFFFFF', '#000000', '#010101']);
  });

  it('treats html and :host like :root as base selectors', () => {
    const css = `.dark { --bg: #000; } html { --bg: #FFF; } .x { --fg: #111; } :host,:root { --fg: #EEE; }`;
    const tokens = parseCssCustomProperties(css);
    expect(tokens.map(t => `${t.name}=${t.value}`)).toEqual([
      'bg=#FFF',
      'fg=#EEE',
      'bg=#000',
      'fg=#111',
    ]);
  });

  it('keeps a :root inside @layer as a base declaration, since @layer is not conditional', () => {
    const css = `.dark { --bg: #000; } @layer base { :root { --bg: #FFF; } }`;
    const tokens = parseCssCustomProperties(css);
    expect(tokens.map(t => t.value)).toEqual(['#FFF', '#000']);
  });

  it('marks a @theme name as a class across its theme overrides so one token never gets two contradictory refs', () => {
    const css = `@theme { --color-surface: #FFFFFF; }
      .dark { --color-surface: #0A0A0A; }`;
    const tokens = parseCssCustomProperties(css).filter(t => t.name === 'color-surface');
    expect(tokens.map(t => t.value)).toEqual(['#FFFFFF', '#0A0A0A']);
    expect(tokens.map(t => t.utilityIsClass)).toEqual([true, true]);
  });

  it('does not mark a namespace-shaped name outside @theme as a class, since nothing generates it', () => {
    const [token] = parseCssCustomProperties(':root { --color-brand: #6266F0; }');
    expect(token?.utility).toBe('brand');
    expect(token?.utilityIsClass).toBeUndefined();
  });

  it('collapses a name and value repeated across blocks so token_map cannot call it ambiguous with itself', () => {
    const css = ':root { --a: 1px; } .x { --a: 1px; } .y { --a: 2px; }';
    const tokens = parseCssCustomProperties(css).filter(t => t.name === 'a');
    expect(tokens.map(t => t.value)).toEqual(['1px', '2px']);
  });

  it('keeps a custom property inside a @mixin when the text is plain CSS', () => {
    expect(parseCssCustomProperties('@mixin theme { --brand: #6266F0; }')).toHaveLength(1);
  });

  it('drops a custom property inside a SCSS @mixin or @function, which only exists where it is included', () => {
    const scss =
      '@mixin theme { --brand: #6266F0; }\n@function f() { --x: 1px; }\n:root { --a: 1px; }';
    expect(parseCssCustomProperties(scss, true).map(t => t.name)).toEqual(['a']);
  });
});
