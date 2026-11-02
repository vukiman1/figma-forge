import { describe, expect, it } from 'vitest';

import { parseScssFile } from '../../../src/tokens/stylesheet/scss-file.js';

describe('parseScssFile', () => {
  it('collapses an interpolated mirror into the custom property, which needs no @use', () => {
    expect(parseScssFile('$brand: #6266F0;\n:root { --brand: #{$brand}; }', 'f.scss')).toEqual([
      { name: 'brand', value: '#6266F0', cssVar: 'var(--brand)' },
    ]);
  });

  it('collapses a mirror written with the literal value', () => {
    expect(parseScssFile('$b: #111111;\n:root { --b: #111111; }', 'f.scss')).toEqual([
      { name: 'b', value: '#111111', cssVar: 'var(--b)' },
    ]);
  });

  it('keeps a variable the file does not mirror', () => {
    const tokens = parseScssFile('$a: #111111;\n:root { --b: #222222; }', 'f.scss');
    expect(tokens.map(t => [t.name, t.scssVar ?? t.cssVar])).toEqual([
      ['a', '$a'],
      ['b', 'var(--b)'],
    ]);
  });

  it('leaves an interpolation of a variable the file does not declare unresolved', () => {
    expect(parseScssFile(':root { --brand: #{$elsewhere}; }', 'f.scss')).toEqual([
      { name: 'brand', value: '#{$elsewhere}', cssVar: 'var(--brand)' },
    ]);
  });

  it('collapses duplicates that only resolving the interpolation creates', () => {
    const tokens = parseScssFile(
      '$brand: #6266F0;\n:root { --brand: #{$brand}; }\n.theme-light { --brand: #6266F0; }',
      'f.scss',
    );
    expect(tokens).toEqual([{ name: 'brand', value: '#6266F0', cssVar: 'var(--brand)' }]);
  });

  it('keeps the variable when its only mirror is scoped to a selector, since that var() resolves nowhere else', () => {
    const scoped = parseScssFile('$brand: #6266F0;\n.theme { --brand: #6266F0; }', 'f.scss');
    expect(scoped.map(t => t.scssVar ?? t.cssVar)).toEqual(['$brand', 'var(--brand)']);
  });

  it('drops a custom property declared inside a mixin body', () => {
    expect(parseScssFile('@mixin theme { --brand: #6266F0; }\n$real: 1px;', 'f.scss')).toEqual([
      { name: 'real', value: '1px', scssVar: '$real', from: 'f.scss' },
    ]);
  });
});
