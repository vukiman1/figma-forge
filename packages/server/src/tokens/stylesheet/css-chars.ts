const WHITESPACE: ReadonlySet<string> = new Set([' ', '\t', '\n', '\r', '\f']);

const NAME_STOPS: ReadonlySet<string> = new Set([
  ':',
  ';',
  '{',
  '}',
  '(',
  ')',
  '[',
  ']',
  '"',
  "'",
  ',',
  '/',
  '!',
]);

export const isWhitespace = (c: string): boolean => WHITESPACE.has(c);

export const isNameChar = (c: string): boolean => !isWhitespace(c) && !NAME_STOPS.has(c);

export const isQuote = (c: string): boolean => c === '"' || c === "'";

export const nameEnd = (css: string, from: number): number => {
  let at = from;
  while (at < css.length) {
    const c = css.charAt(at);
    if (c === '\\') {
      at += 2;
      continue;
    }
    if (!isNameChar(c)) return at;
    at += 1;
  }
  return at;
};

export const skipWhitespace = (css: string, from: number): number => {
  let at = from;
  while (at < css.length && isWhitespace(css.charAt(at))) at += 1;
  return at;
};
