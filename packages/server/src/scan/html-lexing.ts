export interface ScanStop {
  readonly end: number;
  readonly closed: boolean;
}

const HTML_SPACES: ReadonlySet<string> = new Set([' ', '\t', '\n', '\f', '\r']);
const ASCII_ALPHA = /^[A-Za-z]$/;
const UPPER_A = 65;
const UPPER_Z = 90;
const ASCII_CASE_OFFSET = 32;
const NOT_FOUND = -1;

export const COMMENT_OPEN = '<!--';
const COMMENT_CLOSE = '-->';

export const isSpace = (char: string | undefined): boolean =>
  char !== undefined && HTML_SPACES.has(char);

export const isAsciiAlpha = (char: string | undefined): boolean =>
  char !== undefined && ASCII_ALPHA.test(char);

const lowerAscii = (code: number): number =>
  code >= UPPER_A && code <= UPPER_Z ? code + ASCII_CASE_OFFSET : code;

const matchesNameAt = (src: string, at: number, name: string): boolean => {
  if (at + name.length > src.length) return false;
  for (let offset = 0; offset < name.length; offset += 1) {
    if (lowerAscii(src.charCodeAt(at + offset)) !== name.charCodeAt(offset)) return false;
  }
  return true;
};

const isNameDelimiter = (char: string | undefined): boolean =>
  char !== undefined && (isSpace(char) || char === '>' || char === '/');

export const isEndTagNameAt = (src: string, at: number, name: string): boolean =>
  matchesNameAt(src, at, name) && isNameDelimiter(src[at + name.length]);

export const skipToGt = (src: string, from: number): number => {
  const at = src.indexOf('>', from);
  return at === NOT_FOUND ? src.length : at + 1;
};

export const skipComment = (src: string, from: number): ScanStop => {
  const end = src.indexOf(COMMENT_CLOSE, from + COMMENT_OPEN.length);
  if (end === NOT_FOUND) return { end: src.length, closed: false };
  return { end: end + COMMENT_CLOSE.length, closed: true };
};

export const findRawTextEnd = (src: string, from: number, name: string): number | undefined => {
  for (let at = from; at < src.length; at += 1) {
    if (src[at] === '<' && src[at + 1] === '/' && isEndTagNameAt(src, at + 2, name)) return at;
  }
  return undefined;
};

export const isRawTextElement = (name: string): boolean => name === 'script' || name === 'style';
