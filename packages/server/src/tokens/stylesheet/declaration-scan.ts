import { nameEnd, skipWhitespace } from './css-chars.js';
import { readDeclarationValue } from './declaration-value.js';
import {
  CSS_DIALECT,
  type Dialect,
  SCSS_CUSTOM_PROPERTY_DIALECT,
  SCSS_DIALECT,
} from './dialect.js';
import { StylesheetCursor } from './stylesheet-cursor.js';

export interface CssDeclaration {
  readonly name: string;
  readonly value: string;
  readonly scope: string;
  readonly ancestors: readonly string[];
}

const normalizePrelude = (prelude: string): string => prelude.trim().replace(/\s+/g, ' ');

class DeclarationScanner {
  readonly declarations: CssDeclaration[] = [];
  private readonly cursor: StylesheetCursor;
  private readonly stack: string[] = [];
  private prelude = '';

  constructor(css: string, dialect: Dialect) {
    this.cursor = new StylesheetCursor(css, dialect);
  }

  scan(): CssDeclaration[] {
    while (!this.cursor.done) this.step();
    return this.declarations;
  }

  private step(): void {
    const opaque = this.cursor.readOpaque();
    if (opaque !== undefined) {
      this.prelude += opaque;
      return;
    }
    if (this.cursor.atInterpolation()) {
      this.prelude += this.cursor.readSelectorInterpolation();
      return;
    }
    if (this.readStructure(this.cursor.char())) return;
    if (this.atDeclarationStart() && this.readDeclaration()) return;
    this.prelude += this.cursor.take(1);
  }

  private readStructure(c: string): boolean {
    if (c === '{') this.stack.push(normalizePrelude(this.prelude));
    else if (c === '}') this.stack.pop();
    else if (c !== ';') return false;
    this.prelude = '';
    this.cursor.at += 1;
    return true;
  }

  private atDeclarationStart(): boolean {
    const { css, at, dialect } = this.cursor;
    if (!css.startsWith(dialect.sigil, at)) return false;
    if (dialect.requireBlock && this.stack.length === 0) return false;
    return this.prelude.trim() === '';
  }

  private readDeclaration(): boolean {
    const { css, at, dialect } = this.cursor;
    const nameStart = at + dialect.sigil.length;
    const end = nameEnd(css, nameStart);
    const colon = skipWhitespace(css, end);
    if (css.charAt(colon) !== ':' || end <= nameStart) return false;
    this.cursor.at = colon + 1;
    const value = readDeclarationValue(this.cursor);
    if (value.length === 0) return true;
    this.declarations.push({
      name: css.slice(nameStart, end),
      value,
      scope: this.stack.at(-1) ?? '',
      ancestors: this.stack.slice(0, -1),
    });
    return true;
  }
}

export const scanCustomProperties = (css: string, scssSyntax = false): CssDeclaration[] =>
  new DeclarationScanner(css, scssSyntax ? SCSS_CUSTOM_PROPERTY_DIALECT : CSS_DIALECT).scan();

export const scanScssVariables = (scss: string): CssDeclaration[] =>
  new DeclarationScanner(scss, SCSS_DIALECT).scan();
