import { describe, expect, it } from 'vitest';

import { type ProjectToken, refOf } from '../../src/tokens/project-token.js';

const THEME_TOKEN: ProjectToken = {
  name: 'color-brand',
  value: '#6266F0',
  cssVar: 'var(--color-brand)',
  utility: 'brand',
  utilityIsClass: true,
};

describe('refOf', () => {
  it('emits the utility for a class-generating token in a utility-first project', () => {
    expect(refOf(THEME_TOKEN, true)).toBe('brand');
  });

  it('emits the var() reference when the project is not utility-first', () => {
    expect(refOf(THEME_TOKEN, false)).toBe('var(--color-brand)');
  });

  it('emits the var() reference when the utility is only a name stem no framework generates', () => {
    const loose: ProjectToken = { ...THEME_TOKEN, utilityIsClass: false };
    expect(refOf(loose, true)).toBe('var(--color-brand)');
  });

  it('falls back to the utility for a JS-config token that declares no custom property', () => {
    expect(refOf({ name: 'primary', value: '#000', utility: 'primary' }, false)).toBe('primary');
  });

  it('emits the sigilled variable for a SCSS token', () => {
    const token: ProjectToken = { name: 'gap', value: '8px', scssVar: '$gap', from: 'a.scss' };
    expect(refOf(token, true)).toBe('$gap');
  });
});
