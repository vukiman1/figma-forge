import { describe, expect, it } from 'vitest';

import { parseScssVariables } from '../../../src/tokens/stylesheet/scss-variables.js';

describe('parseScssVariables', () => {
  it('emits the reference with its sigil and the file whose @use makes it resolve', () => {
    expect(parseScssVariables('$color-primary-500: #6266F0;', 'src/_tokens.scss')).toEqual([
      {
        name: 'color-primary-500',
        value: '#6266F0',
        scssVar: '$color-primary-500',
        from: 'src/_tokens.scss',
      },
    ]);
  });

  it('drops a variable scoped to a rule, whose reference would not compile elsewhere', () => {
    const tokens = parseScssVariables('$top: 1px;\n.card { $inner: 2px; }', 'a.scss');
    expect(tokens.map(t => t.name)).toEqual(['top']);
  });

  it('derives no utility or category, because SCSS generates no classes', () => {
    const [token] = parseScssVariables('$color-primary-500: #6266F0;', 'a.scss');
    expect(token?.utility).toBeUndefined();
    expect(token?.category).toBeUndefined();
    expect(token?.utilityIsClass).toBeUndefined();
  });

  it('drops a private _ or - prefixed variable, which @use does not export', () => {
    expect(parseScssVariables('$_private: 1px;\n$-also: 2px;\n$public: 3px;', 'a.scss')).toEqual([
      { name: 'public', value: '3px', scssVar: '$public', from: 'a.scss' },
    ]);
  });

  it('does not let selector interpolation make a mixin-local variable look module-level', () => {
    const tokens = parseScssVariables(
      '@mixin v($state) {\n  .table-#{$state} {\n    $color: red;\n  }\n}\n$real: 1px;',
      'a.scss',
    );
    expect(tokens.map(t => t.name)).toEqual(['real']);
  });

  it('keeps one entry per distinct value of a repeated name, collapsing exact repeats', () => {
    const tokens = parseScssVariables('$c: #111;\n$c: #111;\n$c: #222;', 'a.scss');
    expect(tokens.map(t => t.value)).toEqual(['#111', '#222']);
  });
});
