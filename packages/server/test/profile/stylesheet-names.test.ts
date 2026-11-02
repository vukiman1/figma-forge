import { describe, expect, it } from 'vitest';

import { tallyClassNaming } from '../../src/profile/class-naming-tally.js';
import { readStylesheetNames } from '../../src/profile/stylesheet-names.js';

const tallyOf = (...bodies: string[]) => tallyClassNaming(bodies.map(readStylesheetNames));

describe('reading the `&` side of a stylesheet', () => {
  it('counts `&` glued onto a name fragment, in either BEM position', () => {
    expect(tallyOf('.card { &__title { color: red; } &--wide { width: 100%; } }')).toEqual({
      ampersand: 2,
      flat: 0,
    });
  });

  it('ignores the `&` forms that nest a state onto an existing name instead of building one', () => {
    const body = `.card__title {
      &:hover { color: red; }
      &::before { content: ''; }
      &.is-open { display: block; }
      &[aria-current='page'] { font-weight: 700; }
      & > .icon { width: 1rem; }
      && { color: blue; }
    }`;
    expect(tallyOf(body).ampersand).toBe(0);
  });

  it('does not read a `&` out of a comment or a quoted value', () => {
    const body = [
      '.crumb::after { content: "&nbsp;"; }',
      '/* .card { &__title {} } */',
      '// &--legacy',
      '.card__label { color: red; }',
    ].join('\n');
    expect(tallyOf(body)).toEqual({ ampersand: 0, flat: 1 });
  });

  it("joins a wrapped line before reading it, so a tail like Vuetify VAlert.sass's is not read as a rule", () => {
    const body = [
      "@include tools.layer('components')",
      '  .v-alert',
      '    grid-template-areas: "prepend content append close" ". \\',
      'content . ."',
      '  .v-alert-title',
      '    font-weight: 600',
    ];
    expect(tallyOf(body.join('\n'))).toEqual({ ampersand: 0, flat: 1 });
  });

  it('does not count a framework-dictated transition class as a preference for `&`', () => {
    const body = `.fade {
  &-enter-from { opacity: 0; }
  &-enter-active { transition: opacity 0.2s; }
  &-leave-to { opacity: 0; }
  &-move { transition: transform 0.2s; }
  &-exit-done { display: none; }
}`;
    expect(tallyOf(body).ampersand).toBe(0);
  });

  it('still counts a BEM name that merely starts with a transition word after `__` or `--`', () => {
    expect(tallyOf('.dialog {\n  &__enter { top: 0; }\n  &--active { top: 0; }\n}')).toEqual({
      ampersand: 2,
      flat: 0,
    });
  });
});

describe('reading the declared side of a stylesheet', () => {
  it('counts a full compound name only at the top level, not as a descendant selector', () => {
    expect(tallyOf('.card {\n  .card__title { color: red; }\n}').flat).toBe(0);
    expect(tallyOf('.card__title { color: red; }').flat).toBe(1);
  });

  it('still counts a rule that only an at-rule encloses, since it compiles unnested', () => {
    expect(tallyOf('@media (min-width: 40em) {\n  .card__title { color: red; }\n}').flat).toBe(1);
    expect(tallyOf('@layer components {\n  .card__title { color: red; }\n}').flat).toBe(1);
    expect(tallyOf('@include layer(components) {\n  .card__title { color: red; }\n}').flat).toBe(1);
  });

  it('reads the indented (.sass / .styl) syntax, which has no braces to anchor on', () => {
    expect(tallyOf('.card\n  &__title\n    color: red\n')).toEqual({ ampersand: 1, flat: 0 });
  });

  it('treats an indented at-rule wrapper as transparent and an enclosing selector as nesting', () => {
    expect(
      tallyOf("@include tools.layer('components')\n  .card__title\n    color: red\n").flat,
    ).toBe(1);
    expect(tallyOf('.card\n  .card__title\n    color: red\n').flat).toBe(0);
  });

  it('does not mistake a top-level custom property for a compound class', () => {
    expect(tallyOf(':root {\n--color-primary-500: #6266f0;\n}').flat).toBe(0);
  });

  it('lets a single-hyphen scheme vote only when the project declares its block', () => {
    expect(tallyOf('.accordion { }\n.accordion-body { }\n').flat).toBe(1);
    expect(tallyOf('.el-button { }\n').flat).toBe(0);
  });

  it('cross-references the block across files, not only within one', () => {
    expect(tallyOf('.card { }\n', '.card-title { }\n').flat).toBe(1);
  });

  it('counts BEM punctuation without its block being declared anywhere', () => {
    expect(tallyOf('.card__title { color: red; }\n').flat).toBe(1);
  });

  it('excludes a transition class on the flat side as well as the `&` side', () => {
    expect(tallyOf('.fade { }\n.fade-enter { }\n.fade-leave-to { }\n').flat).toBe(0);
  });

  it('does not read a Less mixin definition as a declared class, with either parameter separator', () => {
    expect(readStylesheetNames('.size(@w, @h) {\n  width: @w;\n}\n').topLevel).toEqual([]);
    expect(readStylesheetNames('.size(@w; @h) {\n  width: @w;\n}\n').topLevel).toEqual([]);
    expect(
      readStylesheetNames('.typography-title-1() {\n  font-size: 2rem;\n}\n').topLevel,
    ).toEqual([]);
    expect(tallyOf('.size(@w, @h) { width: @w; }\n.size-lg { width: 4rem; }\n').flat).toBe(0);
  });

  it('keeps a mixin with `;` parameters opaque, so what it nests is not scored as top level', () => {
    expect(tallyOf('.mixin(@w; @h) {\n  .card__title { width: @w; }\n}\n').flat).toBe(0);
  });

  it('skips a Sass or Less interpolated name instead of guessing at what it compiles to', () => {
    expect(readStylesheetNames('.#{$class-prefix}button { color: red; }\n').topLevel).toEqual([]);
    expect(readStylesheetNames('.@{ant-prefix}-btn { color: red; }\n').topLevel).toEqual([]);
    expect(readStylesheetNames('.btn-@{variant} { color: red; }\n').topLevel).toEqual([]);
  });

  it('takes the leading class of each selector in a group, and only the leading one', () => {
    expect(readStylesheetNames('.card, .panel { color: red; }\n').topLevel).toEqual([
      'card',
      'panel',
    ]);
    expect(readStylesheetNames('.card .icon { color: red; }\n').topLevel).toEqual(['card']);
  });
});
