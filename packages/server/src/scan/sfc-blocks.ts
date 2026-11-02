import { COMMENT_OPEN, findRawTextEnd, skipComment, skipToGt } from './html-lexing.js';
import { type OpenTag, readOpenTag } from './open-tag.js';
import { skipElement } from './skip-element.js';

export type ScriptLang = 'ts' | 'tsx' | 'js' | 'jsx';

export interface SfcScriptBlock {
  readonly body: string;
  readonly lang: ScriptLang | null;
  readonly external: boolean;
}

export interface SfcScriptScan {
  readonly blocks: SfcScriptBlock[];
  readonly unterminated: boolean;
}

export interface SfcScanOptions {
  readonly templateIsBlock: boolean;
}

const LANGS: ReadonlyMap<string, ScriptLang> = new Map([
  ['', 'js'],
  ['js', 'js'],
  ['javascript', 'js'],
  ['jsx', 'jsx'],
  ['ts', 'ts'],
  ['tsx', 'tsx'],
  ['typescript', 'ts'],
]);

const TAGLESS_MARKUP_STARTS: ReadonlySet<string> = new Set(['!', '?', '/']);

const langOf = (attrs: ReadonlyMap<string, string>): ScriptLang | null => {
  const raw = attrs.get('lang');
  if (raw === undefined) return 'js';
  return LANGS.get(raw.trim().toLowerCase()) ?? null;
};

class SfcScriptScanner {
  readonly blocks: SfcScriptBlock[] = [];
  private readonly code: string;
  private readonly templateIsBlock: boolean;

  constructor(code: string, options: SfcScanOptions) {
    this.code = code;
    this.templateIsBlock = options.templateIsBlock;
  }

  advance(at: number): number | null {
    if (this.code[at] !== '<') return at + 1;
    if (this.code.startsWith(COMMENT_OPEN, at)) {
      const comment = skipComment(this.code, at);
      return comment.closed ? comment.end : null;
    }
    if (TAGLESS_MARKUP_STARTS.has(this.code.charAt(at + 1))) return skipToGt(this.code, at);
    const tag = readOpenTag(this.code, at);
    if (tag === null) return at + 1;
    return tag.closed ? this.afterTag(tag) : null;
  }

  private afterTag(tag: OpenTag): number | null {
    if (tag.name === 'script') return this.readScript(tag);
    if (tag.name === 'style') return this.skipRawText(tag);
    if (!this.templateIsBlock || tag.name !== 'template' || tag.selfClosing) return tag.end;
    const skipped = skipElement(this.code, tag.end, 'template');
    return skipped.closed ? skipped.end : null;
  }

  private readScript(tag: OpenTag): number | null {
    const src = tag.attrs.get('src');
    const block = { lang: langOf(tag.attrs), external: src !== undefined && src !== '' };
    if (tag.selfClosing) {
      this.blocks.push({ body: '', ...block });
      return tag.end;
    }
    const rawEnd = findRawTextEnd(this.code, tag.end, 'script');
    if (rawEnd === undefined) return null;
    this.blocks.push({ body: this.code.slice(tag.end, rawEnd), ...block });
    return skipToGt(this.code, rawEnd);
  }

  private skipRawText(tag: OpenTag): number | null {
    const rawEnd = findRawTextEnd(this.code, tag.end, tag.name);
    return rawEnd === undefined ? null : skipToGt(this.code, rawEnd);
  }
}

export const scanSfcScripts = (code: string, options: SfcScanOptions): SfcScriptScan => {
  const scanner = new SfcScriptScanner(code, options);
  let at = 0;
  while (at < code.length) {
    const next = scanner.advance(at);
    if (next === null) return { blocks: scanner.blocks, unterminated: true };
    at = next;
  }
  return { blocks: scanner.blocks, unterminated: false };
};
