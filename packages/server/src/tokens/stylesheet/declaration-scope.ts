export enum ScopeRank {
  Theme = 0,
  Base = 1,
  Override = 2,
}

const THEME_AT_RULE = /^@theme\b/i;
const BASE_SELECTOR = /(^|[\s,])(:root\b|:host\b|html\b)/i;
const CONDITIONAL_AT_RULE = /^@(media|supports|container)\b/i;

export const scopeRank = (scope: string, ancestors: readonly string[]): ScopeRank => {
  if ([...ancestors, scope].some(s => THEME_AT_RULE.test(s))) return ScopeRank.Theme;
  const isConditional = ancestors.some(a => CONDITIONAL_AT_RULE.test(a));
  if (BASE_SELECTOR.test(scope) && !isConditional) return ScopeRank.Base;
  return ScopeRank.Override;
};

export const isBaseScopedDeclaration = (scope: string, ancestors: readonly string[]): boolean =>
  scopeRank(scope, ancestors) <= ScopeRank.Base;
