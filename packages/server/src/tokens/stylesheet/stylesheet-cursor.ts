import { isNameChar, isQuote } from './css-chars.js';
import type { Dialect } from './dialect.js';

const URL_OPEN = 'url(';
const BLOCK_COMMENT_CLOSE = '*/';

export class StylesheetCursor {
  at = 0;
  readonly css: string;
  readonly dialect: Dialect;

  constructor(css: string, dialect: Dialect) {
    this.css = css;
    this.dialect = dialect;
  }

  get done(): boolean {
    return this.at >= this.css.length;
  }

  char(offset = 0): string {
    return this.css.charAt(this.at + offset);
  }

  take(length: number): string {
    const text = this.css.slice(this.at, this.at + length);
    this.at += length;
    return text;
  }

  atInterpolation(): boolean {
    return this.dialect.interpolation && this.char() === '#' && this.char(1) === '{';
  }

  readOpaque(): string | undefined {
    if (this.atUrl()) return this.readUrl();
    if (this.atComment()) {
      this.skipComment();
      return '';
    }
    if (isQuote(this.char())) return this.readString();
    if (this.char() === '\\') return this.take(2);
    return undefined;
  }

  readSelectorInterpolation(): string {
    const start = this.at;
    this.at += 2;
    let depth = 1;
    while (!this.done && depth > 0) {
      const c = this.char();
      if (isQuote(c)) {
        this.readString();
        continue;
      }
      if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      this.at += 1;
    }
    return this.css.slice(start, this.at);
  }

  private readString(): string {
    const quote = this.char();
    let text = this.take(1);
    while (!this.done) {
      const c = this.char();
      if (c === '\\') {
        text += this.take(2);
        continue;
      }
      text += this.take(1);
      if (c === quote) break;
    }
    return text;
  }

  private atUrl(): boolean {
    if (!this.dialect.lineComments) return false;
    if (this.css.slice(this.at, this.at + URL_OPEN.length).toLowerCase() !== URL_OPEN) return false;
    return !(this.at > 0 && isNameChar(this.char(-1)));
  }

  private readUrl(): string {
    let text = this.take(URL_OPEN.length);
    let depth = 1;
    while (!this.done && depth > 0) {
      const c = this.char();
      if (isQuote(c)) {
        text += this.readString();
        continue;
      }
      if (c === '(') depth += 1;
      else if (c === ')') depth -= 1;
      text += this.take(1);
    }
    return text;
  }

  private atComment(): boolean {
    if (this.char() !== '/') return false;
    return this.char(1) === '*' || (this.dialect.lineComments && this.char(1) === '/');
  }

  private skipComment(): void {
    const isBlock = this.char(1) === '*';
    const end = this.css.indexOf(isBlock ? BLOCK_COMMENT_CLOSE : '\n', this.at + 2);
    if (end < 0) this.at = this.css.length;
    else this.at = end + (isBlock ? BLOCK_COMMENT_CLOSE.length : 1);
  }
}
