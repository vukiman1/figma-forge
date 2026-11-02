import { describe, expect, it } from 'vitest';

import {
  scanCustomProperties,
  scanScssVariables,
} from '../../../src/tokens/stylesheet/declaration-scan.js';

const pairs = (css: string): string[] => scanCustomProperties(css).map(d => `${d.name}=${d.value}`);

const scssPairs = (src: string): string[] =>
  scanCustomProperties(src, true).map(d => `${d.name}=${d.value}`);

const variablePairs = (scss: string): string[] =>
  scanScssVariables(scss).map(d => `${d.name}=${d.value}`);

describe('scanCustomProperties', () => {
  it('reads declarations with their block chain', () => {
    const decls = scanCustomProperties('@media (min-width: 60rem) { .card { --pad: 8px; } }');
    expect(decls).toEqual([
      { name: 'pad', value: '8px', scope: '.card', ancestors: ['@media (min-width: 60rem)'] },
    ]);
  });

  it('keeps same-named declarations from different blocks apart', () => {
    const decls = scanCustomProperties(':root { --bg: #FFF; } .dark { --bg: #000; }');
    expect(decls.map(d => [d.scope, d.value])).toEqual([
      [':root', '#FFF'],
      ['.dark', '#000'],
    ]);
  });

  it('ends the last declaration of a minified block at the closing brace, not the next semicolon', () => {
    expect(pairs('.a{--x:100%}@media (min-width:768px){.b{--x:112.5%}}')).toEqual([
      'x=100%',
      'x=112.5%',
    ]);
  });

  it('does not treat a semicolon inside a string as a terminator', () => {
    expect(pairs(':root { --sep: "a;b"; --after: #FF0000; }')).toEqual([
      'sep="a;b"',
      'after=#FF0000',
    ]);
  });

  it('does not treat a semicolon inside url() as a terminator', () => {
    expect(pairs(':root { --u: url(http://x/y;z.png); --after: 1px; }')).toEqual([
      'u=url(http://x/y;z.png)',
      'after=1px',
    ]);
  });

  it('does not mistake comment syntax inside a string for a comment', () => {
    expect(pairs(':root { --url: url("http://x/*y*/z.png"); --after: #0F0; }')).toEqual([
      'url=url("http://x/*y*/z.png")',
      'after=#0F0',
    ]);
  });

  it('skips real comments, including ones holding declaration-shaped text', () => {
    expect(pairs(':root { /* c */ --a: 1px; /* --fake: 2px; */ --b: 2px; }')).toEqual([
      'a=1px',
      'b=2px',
    ]);
  });

  it('ignores var() usages, which are not declarations', () => {
    expect(pairs('.x { color: var(--nope); --real: 1px; }')).toEqual(['real=1px']);
  });

  it('ignores a var() usage that is not followed by a semicolon', () => {
    expect(pairs('.x { color: var(--nope) } .y { --real: 1px; }')).toEqual(['real=1px']);
  });

  it('handles a closing brace inside a string value', () => {
    expect(pairs('.a { --brace: "}"; --after: 1px; }')).toEqual(['brace="}"', 'after=1px']);
  });

  it('handles escaped quotes in a value', () => {
    expect(pairs(':root { --q: "he said \\"hi\\""; --after: 1px; }')).toEqual([
      'q="he said \\"hi\\""',
      'after=1px',
    ]);
  });

  it('handles a semicolon inside an attribute selector', () => {
    const decls = scanCustomProperties('[data-theme="dark;x"] { --a: 1px; }');
    expect(decls.map(d => [d.scope, d.name])).toEqual([['[data-theme="dark;x"]', 'a']]);
  });

  it('strips a single !important flag so the value equals its unflagged twin', () => {
    expect(pairs(':root { --a: 1px !important; --b: 2px!important; }')).toEqual(['a=1px', 'b=2px']);
  });

  it('skips empty values, which declare nothing a token join can use', () => {
    expect(pairs(':root { --a:; --b: 1px; }')).toEqual(['b=1px']);
  });

  it('tracks nested CSS blocks', () => {
    const decls = scanCustomProperties('.card { --pad: 4px; &:hover { --pad: 8px; } }');
    expect(decls.map(d => [d.scope, d.ancestors, d.value])).toEqual([
      ['.card', [], '4px'],
      ['&:hover', ['.card'], '8px'],
    ]);
  });

  it('reads declarations directly inside an at-rule block', () => {
    const decls = scanCustomProperties('@theme { --color-a: #111; }');
    expect(decls).toEqual([{ name: 'color-a', value: '#111', scope: '@theme', ancestors: [] }]);
  });

  it('normalizes whitespace in a multi-line prelude', () => {
    const decls = scanCustomProperties('.a,\n  .b {\n  --x: 1px;\n}');
    expect(decls[0]?.scope).toBe('.a, .b');
  });

  it('ignores a statement at-rule that has no block', () => {
    expect(pairs('@import url("a.css");\n:root { --a: 1px; }')).toEqual(['a=1px']);
  });

  it('ignores custom properties outside any block', () => {
    expect(pairs('--stray: 1px;\n:root { --a: 1px; }')).toEqual(['a=1px']);
  });

  it('treats a custom-property name with no colon as selector text', () => {
    expect(pairs(':root { --orphan --a: 1px; }')).toEqual([]);
  });

  it('preserves multi-part and functional values verbatim', () => {
    expect(pairs(':root { --s: 0 1px 2px rgba(0,0,0,.4); --b: oklch(0.6 0.2 270); }')).toEqual([
      's=0 1px 2px rgba(0,0,0,.4)',
      'b=oklch(0.6 0.2 270)',
    ]);
  });

  it('handles a data URI whose value contains a semicolon', () => {
    expect(pairs(':root { --img: url(data:image/svg+xml;base64,AAA=); --after: 1px; }')).toEqual([
      'img=url(data:image/svg+xml;base64,AAA=)',
      'after=1px',
    ]);
  });

  it('drops a leading BOM from the scope, since trim() treats U+FEFF as whitespace', () => {
    const decls = scanCustomProperties('﻿:root { --a: 1px; }');
    expect(decls[0]?.scope).toBe(':root');
  });

  it('surfaces an unterminated string as far as it was read instead of throwing', () => {
    expect(pairs(':root { --a: 1px; --b: "unterminated')).toEqual(['a=1px', 'b="unterminated']);
  });

  it('runs an unterminated comment to end of input instead of throwing', () => {
    expect(pairs(':root { --a: 1px; } /* unterminated')).toEqual(['a=1px']);
  });

  it('keeps reading past unbalanced closing braces', () => {
    expect(pairs('.a { --x: 1px; }}} .b { --y: 2px; }')).toEqual(['x=1px', 'y=2px']);
  });

  it('returns nothing for an empty stylesheet', () => {
    expect(scanCustomProperties('')).toEqual([]);
  });
});

describe('scanCustomProperties in a .scss file', () => {
  it('skips // comments so the declaration after one is not swallowed into the prelude', () => {
    expect(
      scssPairs(':root {\n  // brand palette\n  --brand: #6266F0;\n  --accent: #FF0000;\n}'),
    ).toEqual(['brand=#6266F0', 'accent=#FF0000']);
  });

  it('does not let a brace inside a // comment close the enclosing block', () => {
    expect(scssPairs(':root { // dark theme uses } here\n --brand: #6266F0; }')).toEqual([
      'brand=#6266F0',
    ]);
  });
});

describe('scanScssVariables', () => {
  it('reads top-level declarations and strips !default and !global, which are not part of the value', () => {
    expect(variablePairs('$a: #6266F0;\n$b: 8px !default;\n$c: 4px !global;')).toEqual([
      'a=#6266F0',
      'b=8px',
      'c=4px',
    ]);
  });

  it('skips // line comments, which CSS does not have', () => {
    expect(variablePairs('// $fake: 1px;\n$real: 2px; // trailing $alsoFake: 3px;')).toEqual([
      'real=2px',
    ]);
  });

  it('does not let a brace inside a // comment open a block that would scope every later variable', () => {
    const decls = scanScssVariables('// TODO: handle the { } case\n$after: 1px;');
    expect(decls.map(d => [d.name, d.scope])).toEqual([['after', '']]);
  });

  it('keeps a value whose commas and semicolons are inside parens or strings', () => {
    expect(variablePairs('$s: 0 1px rgba(0,0,0,.1), 0 4px rgba(0,0,0,.2);')).toEqual([
      's=0 1px rgba(0,0,0,.1), 0 4px rgba(0,0,0,.2)',
    ]);
    expect(variablePairs('$u: url("http://a/b;c.png");')).toEqual(['u=url("http://a/b;c.png")']);
    expect(variablePairs('$m: (primary: #fff, teal: #000);')).toEqual([
      'm=(primary: #fff, teal: #000)',
    ]);
  });

  it('does not mistake a variable reference after a property name for a declaration', () => {
    expect(variablePairs('.x { color: $a; }')).toEqual([]);
  });

  it("does not read a mixin's default argument as a module-level variable", () => {
    expect(variablePairs('@mixin m($arg: 10px) { margin: $arg; }')).toEqual([]);
  });

  it('tags a variable declared inside a rule with that rule as its scope', () => {
    const decls = scanScssVariables('$top: 1px;\n.card { $inner: 2px; }');
    expect(decls.map(d => [d.name, d.scope])).toEqual([
      ['top', ''],
      ['inner', '.card'],
    ]);
  });

  it('does not read // inside an unquoted url() in a value as a comment that would leave the rule open', () => {
    expect(
      variablePairs('.hero { background: url(http://cdn.io/a.png); }\n$primary: #6266F0;'),
    ).toEqual(['primary=#6266F0']);
  });

  it('does not read // inside a url() in prelude position, like a leading @import, as a comment', () => {
    expect(
      variablePairs('@import url(https://fonts.googleapis.com/css2?family=Inter);\n$a: 1px;'),
    ).toEqual(['a=1px']);
  });

  it('keeps a protocol-relative url() whose value opens with //', () => {
    expect(variablePairs('$cdn: url(//cdn.io/a.png);\n$other: 4px;')).toEqual([
      'cdn=url(//cdn.io/a.png)',
      'other=4px',
    ]);
  });

  it('keeps nested parens inside a url() whole', () => {
    expect(variablePairs('$n: url(data:image/svg+xml,%3Csvg(x)%3E);\n$after: 2px;')).toEqual([
      'n=url(data:image/svg+xml,%3Csvg(x)%3E)',
      'after=2px',
    ]);
  });

  it('keeps a quoted closing paren inside a url() whole', () => {
    expect(variablePairs('$q: url("a)b.png");\n$after: 2px;')).toEqual([
      'q=url("a)b.png")',
      'after=2px',
    ]);
  });

  it('strips every trailing flag so the value can match its Figma or CSS twin', () => {
    expect(variablePairs('$b: 4px !default !global;')).toEqual(['b=4px']);
    expect(variablePairs('$c: red !important;')).toEqual(['c=red']);
    expect(variablePairs('$d: 1rem !important !default;')).toEqual(['d=1rem']);
  });

  it('keeps a value whose interpolation closing brace would otherwise end it', () => {
    expect(variablePairs('$c: #{$half} 0;')).toEqual(['c=#{$half} 0']);
    expect(variablePairs('$d: 0 #{$a} 0 #{$b};\n$e: 1px;')).toEqual(['d=0 #{$a} 0 #{$b}', 'e=1px']);
  });

  it('consumes interpolation in a selector whole so its braces do not open a phantom block', () => {
    const decls = scanScssVariables('.table-#{$state} { $color: red; }\n$real: 1px;');
    expect(decls.map(d => [d.name, d.scope])).toEqual([
      ['color', '.table-#{$state}'],
      ['real', ''],
    ]);
  });

  it('degrades on malformed input rather than throwing', () => {
    expect(() => scanScssVariables('$a: (unclosed')).not.toThrow();
    expect(() => scanScssVariables('/* unterminated')).not.toThrow();
    expect(scanScssVariables('')).toEqual([]);
  });
});
