import { bracedRules } from './braced-rules.js';
import { indentedRules } from './indented-rules.js';
import type { SelectorRule } from './selector-rule.js';
import { INTERPOLATION_MARK, stripStylesheetNoise } from './stylesheet-noise.js';
import { isTransitionConcat } from './transition-names.js';

const AMPERSAND_CONCAT = /&[A-Za-z0-9_-]+/g;
const LEADING_CLASS = /^\.([A-Za-z_-][A-Za-z0-9_-]*)/;
const MIXIN_PARAMETERS_OPEN = '(';

export interface StylesheetNames {
  readonly ampersand: number;
  readonly topLevel: readonly string[];
}

const rulesOf = (body: string): Generator<SelectorRule> =>
  body.includes('{') ? bracedRules(body) : indentedRules(body);

const declaredClass = (selector: string): string | undefined => {
  const name = LEADING_CLASS.exec(selector)?.[1];
  if (name === undefined) return undefined;
  const next = selector[name.length + 1];
  return next === MIXIN_PARAMETERS_OPEN || next === INTERPOLATION_MARK ? undefined : name;
};

const declaredClasses = (prelude: string): string[] =>
  prelude.split(',').flatMap(part => declaredClass(part.trim()) ?? []);

export const readStylesheetNames = (body: string): StylesheetNames => {
  const clean = stripStylesheetNoise(body);
  const concats = clean.match(AMPERSAND_CONCAT) ?? [];
  const topLevel = [...rulesOf(clean)]
    .filter(rule => rule.topLevel)
    .flatMap(rule => declaredClasses(rule.prelude));
  return { ampersand: concats.filter(concat => !isTransitionConcat(concat)).length, topLevel };
};
