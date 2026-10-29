import type { SelectorRule } from './selector-rule.js';

const BRACED_DELIMITER = /[{}();]/g;
const AT_RULE_PREFIX = '@';

class BracedRuleWalk {
  private readonly body: string;
  private readonly enclosingIsSelector: boolean[] = [];
  private selectorDepth = 0;
  private openParens = 0;
  private preludeStart = 0;

  constructor(body: string) {
    this.body = body;
  }

  read(delimiter: string, at: number): SelectorRule | undefined {
    if (delimiter === '{') return this.openBlock(at);
    if (delimiter === '}') this.closeBlock(at);
    else if (delimiter === '(') this.openParens += 1;
    else if (delimiter === ')') this.openParens = Math.max(0, this.openParens - 1);
    else if (this.openParens === 0) this.preludeStart = at + 1;
    return undefined;
  }

  private openBlock(at: number): SelectorRule | undefined {
    const prelude = this.body.slice(this.preludeStart, at).trim();
    const isSelector = !prelude.startsWith(AT_RULE_PREFIX);
    const rule = isSelector ? { prelude, topLevel: this.selectorDepth === 0 } : undefined;
    if (isSelector) this.selectorDepth += 1;
    this.enclosingIsSelector.push(isSelector);
    this.startPrelude(at);
    return rule;
  }

  private closeBlock(at: number): void {
    if (this.enclosingIsSelector.pop() === true) this.selectorDepth -= 1;
    this.startPrelude(at);
  }

  private startPrelude(at: number): void {
    this.openParens = 0;
    this.preludeStart = at + 1;
  }
}

export function* bracedRules(body: string): Generator<SelectorRule> {
  const walk = new BracedRuleWalk(body);
  for (const token of body.matchAll(BRACED_DELIMITER)) {
    const rule = walk.read(token[0], token.index);
    if (rule !== undefined) yield rule;
  }
}
