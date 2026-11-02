import { normHex } from './hex.js';
import type { ProjectToken } from './project-token.js';

export type TokenValueIndex = ReadonlyMap<string, readonly ProjectToken[]>;

export const buildTokenValueIndex = (tokens: readonly ProjectToken[]): TokenValueIndex => {
  const byHex = new Map<string, ProjectToken[]>();
  const seen = new Set<string>();
  for (const token of tokens) {
    const hex = normHex(token.value);
    if (hex === null) continue;
    const key = `${hex}\u0000${token.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const matches = byHex.get(hex);
    if (matches === undefined) byHex.set(hex, [token]);
    else matches.push(token);
  }
  return byHex;
};
