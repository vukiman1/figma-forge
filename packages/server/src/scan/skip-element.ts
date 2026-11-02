import {
  COMMENT_OPEN,
  findRawTextEnd,
  isEndTagNameAt,
  isRawTextElement,
  type ScanStop,
  skipComment,
  skipToGt,
} from './html-lexing.js';
import { readOpenTag } from './open-tag.js';

type Step = number | ScanStop;

class ElementSkipper {
  private readonly src: string;
  private readonly name: string;
  private depth = 1;

  constructor(src: string, name: string) {
    this.src = src;
    this.name = name;
  }

  step(at: number): Step {
    if (this.src[at] !== '<') return at + 1;
    if (this.src.startsWith(COMMENT_OPEN, at)) {
      const comment = skipComment(this.src, at);
      return comment.closed ? comment.end : comment;
    }
    return this.src[at + 1] === '/' ? this.endTag(at) : this.openTag(at);
  }

  private endTag(at: number): Step {
    const next = skipToGt(this.src, at);
    if (!isEndTagNameAt(this.src, at + 2, this.name)) return next;
    this.depth -= 1;
    return this.depth === 0 ? { end: next, closed: true } : next;
  }

  private openTag(at: number): Step {
    const tag = readOpenTag(this.src, at);
    if (tag === null) return at + 1;
    const unclosed = { end: this.src.length, closed: false };
    if (isRawTextElement(tag.name)) {
      const rawEnd = findRawTextEnd(this.src, tag.end, tag.name);
      return rawEnd === undefined ? unclosed : skipToGt(this.src, rawEnd);
    }
    if (!tag.closed) return unclosed;
    if (tag.name === this.name && !tag.selfClosing) this.depth += 1;
    return tag.end;
  }
}

export const skipElement = (src: string, from: number, name: string): ScanStop => {
  const skipper = new ElementSkipper(src, name);
  let at = from;
  while (at < src.length) {
    const step = skipper.step(at);
    if (typeof step !== 'number') return step;
    at = step;
  }
  return { end: src.length, closed: false };
};
