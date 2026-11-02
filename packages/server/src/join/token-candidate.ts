import { type ProjectToken, refOf } from '../tokens/project-token.js';
import type { TokenCandidate } from './token-mapping.js';

export const createTokenCandidate = (
  token: ProjectToken,
  confidence: number,
  matchedBy: TokenCandidate['matchedBy'],
  isUtilityFirst: boolean,
  ambiguousWith: readonly string[] = [],
  ambiguousFrom: readonly string[] = [],
): TokenCandidate => ({
  token: token.name,
  ref: refOf(token, isUtilityFirst),
  ...(token.cssVar === undefined ? {} : { cssVar: token.cssVar }),
  ...(isUtilityFirst && token.utilityIsClass === true && token.utility !== undefined
    ? { utility: token.utility }
    : {}),
  ...(token.from === undefined ? {} : { from: token.from }),
  confidence: Number(confidence.toFixed(3)),
  matchedBy,
  ...(ambiguousWith.length === 0 ? {} : { ambiguousWith: [...ambiguousWith] }),
  ...(ambiguousFrom.length === 0 ? {} : { ambiguousFrom: [...ambiguousFrom] }),
});
