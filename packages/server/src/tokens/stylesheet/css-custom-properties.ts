import type { ProjectToken } from '../project-token.js';
import { type CssDeclaration, scanCustomProperties } from './declaration-scan.js';
import { ScopeRank, scopeRank } from './declaration-scope.js';
import { tailwindNamespaceOf } from './tailwind-namespace.js';
import { nameValueKey, uniqueBy } from './unique-by.js';

const NON_EMITTING_AT_RULE = /^@(mixin|function)\b/i;

interface RankedDeclaration {
  readonly declaration: CssDeclaration;
  readonly index: number;
  readonly rank: ScopeRank;
}

const isEmitted = (declaration: CssDeclaration): boolean =>
  ![declaration.scope, ...declaration.ancestors].some(s => NON_EMITTING_AT_RULE.test(s));

const rankDeclarations = (css: string, scssSyntax: boolean): RankedDeclaration[] =>
  scanCustomProperties(css, scssSyntax)
    .filter(declaration => !scssSyntax || isEmitted(declaration))
    .map((declaration, index) => ({
      declaration,
      index,
      rank: scopeRank(declaration.scope, declaration.ancestors),
    }))
    .toSorted((a, b) => a.rank - b.rank || a.index - b.index);

const toToken = (declaration: CssDeclaration, isClass: boolean): ProjectToken => ({
  name: declaration.name,
  value: declaration.value,
  cssVar: `var(--${declaration.name})`,
  ...tailwindNamespaceOf(declaration.name),
  ...(isClass ? { utilityIsClass: true } : {}),
});

export const parseCssCustomProperties = (css: string, scssSyntax = false): ProjectToken[] => {
  const ranked = rankDeclarations(css, scssSyntax);
  const classNames = new Set(
    ranked.filter(r => r.rank === ScopeRank.Theme).map(r => r.declaration.name),
  );
  return uniqueBy(
    ranked.map(r => r.declaration),
    nameValueKey,
  ).map(declaration => toToken(declaration, classNames.has(declaration.name)));
};
