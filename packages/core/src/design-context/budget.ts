export const DETAIL_LEVELS = ['minimal', 'compact', 'full'] as const;
export type DetailLevel = (typeof DETAIL_LEVELS)[number];

export const DESIGN_CONTEXT_BAIL_NODES = 1500;

export const DESIGN_CONTEXT_TOKEN_BUDGET = 24_000;

const CHARS_PER_TOKEN = 2;

const CJK = /[　-鿿＀-￯]/u;

const countCjk = (text: string): number => {
  let count = 0;
  for (const char of text) if (CJK.test(char)) count += 1;
  return count;
};

export const estimateResultTokens = (serialized: string): number => {
  const cjkCount = countCjk(serialized);
  return cjkCount + Math.ceil((serialized.length - cjkCount) / CHARS_PER_TOKEN);
};
