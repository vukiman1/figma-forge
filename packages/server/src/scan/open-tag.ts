import { isAsciiAlpha, isSpace } from './html-lexing.js';

export interface OpenTag {
  readonly name: string;
  readonly attrs: ReadonlyMap<string, string>;
  readonly end: number;
  readonly selfClosing: boolean;
  readonly closed: boolean;
}

enum TagEnding {
  Open = 'open',
  StraySlash = 'stray-slash',
  Closed = 'closed',
  SelfClosed = 'self-closed',
  Unterminated = 'unterminated',
}

const isTagNameChar = (char: string): boolean => !isSpace(char) && char !== '>' && char !== '/';
const isAttributeNameChar = (char: string): boolean => isTagNameChar(char) && char !== '=';
const isUnquotedValueChar = (char: string): boolean => !isSpace(char) && char !== '>';

class OpenTagReader {
  private readonly src: string;
  private at: number;

  constructor(src: string, at: number) {
    this.src = src;
    this.at = at;
  }

  read(): OpenTag {
    const name = this.readWhile(isTagNameChar).toLowerCase();
    const attrs = new Map<string, string>();
    let ending = this.settle();
    while (ending === TagEnding.Open) {
      this.readAttribute(attrs);
      ending = this.settle();
    }
    const selfClosing = ending === TagEnding.SelfClosed;
    return { name, attrs, end: this.at, selfClosing, closed: ending !== TagEnding.Unterminated };
  }

  private settle(): TagEnding {
    let ending = this.ending();
    while (ending === TagEnding.StraySlash) {
      this.at += 1;
      ending = this.ending();
    }
    return ending;
  }

  private ending(): TagEnding {
    this.readWhile(isSpace);
    const char = this.src[this.at];
    if (char === undefined) return TagEnding.Unterminated;
    if (char === '>') {
      this.at += 1;
      return TagEnding.Closed;
    }
    if (char !== '/') return TagEnding.Open;
    if (this.src[this.at + 1] !== '>') return TagEnding.StraySlash;
    this.at += 2;
    return TagEnding.SelfClosed;
  }

  private readAttribute(attrs: Map<string, string>): void {
    const name = this.readWhile(isAttributeNameChar);
    if (name === '') {
      this.at += 1;
      return;
    }
    this.readWhile(isSpace);
    attrs.set(name.toLowerCase(), this.readAttributeValue());
  }

  private readAttributeValue(): string {
    if (this.src[this.at] !== '=') return '';
    this.at += 1;
    this.readWhile(isSpace);
    const quote = this.src[this.at];
    if (quote !== '"' && quote !== "'") return this.readWhile(isUnquotedValueChar);
    const close = this.src.indexOf(quote, this.at + 1);
    const end = close === -1 ? this.src.length : close;
    const value = this.src.slice(this.at + 1, end);
    this.at = close === -1 ? this.src.length : close + 1;
    return value;
  }

  private readWhile(accepts: (char: string) => boolean): string {
    const start = this.at;
    while (this.at < this.src.length && accepts(this.src.charAt(this.at))) this.at += 1;
    return this.src.slice(start, this.at);
  }
}

export const readOpenTag = (src: string, start: number): OpenTag | null =>
  isAsciiAlpha(src[start + 1]) ? new OpenTagReader(src, start + 1).read() : null;
