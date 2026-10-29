import type { SelectorRule } from './selector-rule.js';

const DECLARATION = /^[-A-Za-z$][\w-]*\s*:/;
const SELECTOR_PUNCTUATION = /^[.#&%[*>+~:]/;
const ELEMENT_SELECTOR = /^[A-Za-z][\w-]*(?:[\s,.:#[]|$)/;
const AT_RULE_PREFIX = '@';

interface OpenRule {
  readonly indent: number;
  readonly isSelector: boolean;
}

const opensSelector = (content: string): boolean =>
  SELECTOR_PUNCTUATION.test(content) ||
  (!DECLARATION.test(content) && ELEMENT_SELECTOR.test(content));

class IndentLadder {
  private readonly open: OpenRule[] = [];
  private selectorDepth = 0;

  read(line: string): SelectorRule | undefined {
    const content = line.trim();
    if (content === '') return undefined;
    const indent = line.length - line.trimStart().length;
    this.closeFrom(indent);
    if (content.startsWith(AT_RULE_PREFIX)) {
      this.open.push({ indent, isSelector: false });
      return undefined;
    }
    if (!opensSelector(content)) return undefined;
    const rule = { prelude: content, topLevel: this.selectorDepth === 0 };
    this.open.push({ indent, isSelector: true });
    this.selectorDepth += 1;
    return rule;
  }

  private closeFrom(indent: number): void {
    while (this.isOpenAt(indent)) {
      if (this.open.pop()?.isSelector === true) this.selectorDepth -= 1;
    }
  }

  private isOpenAt(indent: number): boolean {
    const top = this.open.at(-1);
    return top !== undefined && top.indent >= indent;
  }
}

export function* indentedRules(body: string): Generator<SelectorRule> {
  const ladder = new IndentLadder();
  for (const line of body.split('\n')) {
    const rule = ladder.read(line);
    if (rule !== undefined) yield rule;
  }
}
