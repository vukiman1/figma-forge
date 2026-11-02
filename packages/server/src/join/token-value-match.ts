import type { FigmaToken } from '../tokens/figma-tokens.js';
import { normHex } from '../tokens/hex.js';
import type { ProjectToken } from '../tokens/project-token.js';
import { statusFor } from './status.js';
import { createTokenCandidate } from './token-candidate.js';
import type { TokenJoinOptions, TokenMapping } from './token-mapping.js';
import { type NameMatch, nameScore } from './token-name-match.js';

interface ScoredToken {
  token: ProjectToken;
  score: number;
}

const compareScoredTokens = (left: ScoredToken, right: ScoredToken): number =>
  right.score - left.score ||
  (left.token.name < right.token.name ? -1 : left.token.name > right.token.name ? 1 : 0);

const scoreTokens = (
  figma: FigmaToken,
  tokens: readonly ProjectToken[],
  isTypography: boolean,
): ScoredToken[] =>
  tokens
    .map(token => ({ token, score: nameScore(figma.name, token, isTypography) }))
    .toSorted(compareScoredTokens);

const doesNameDisambiguate = (matches: readonly ScoredToken[]): boolean => {
  const [best, runnerUp] = matches;
  if (best === undefined) return false;
  return matches.length === 1 || (best.score >= 0.5 && best.score > (runnerUp?.score ?? -1));
};

const createResolvedMapping = (
  base: TokenMapping,
  best: ScoredToken,
  nameMatch: NameMatch | null,
  matchCount: number,
  options: TokenJoinOptions,
): TokenMapping => {
  const doesNameAgree =
    nameMatch !== null && nameMatch.token.name === best.token.name && nameMatch.score >= 0.5;
  const confidence = doesNameAgree ? 1 : 0.9;
  const matchedBy =
    doesNameAgree || (matchCount > 1 && best.score >= 0.5)
      ? (['name', 'value'] as const)
      : (['value'] as const);
  return {
    ...base,
    candidate: createTokenCandidate(
      best.token,
      confidence,
      [...matchedBy],
      options.utilityFirst === true,
    ),
    status: statusFor(confidence, options.threshold),
  };
};

const createAmbiguousMapping = (
  base: TokenMapping,
  best: ScoredToken,
  matches: readonly ScoredToken[],
  options: TokenJoinOptions,
): TokenMapping => {
  const alternatives = matches
    .slice(1)
    .flatMap(match => (match.token.name === best.token.name ? [] : [match.token.name]));
  const otherFiles = matches
    .slice(1)
    .flatMap(match =>
      match.token.name === best.token.name && match.token.from !== undefined
        ? [match.token.from]
        : [],
    );
  const confidence = 0.7;
  return {
    ...base,
    candidate: createTokenCandidate(
      best.token,
      confidence,
      ['value'],
      options.utilityFirst === true,
      alternatives,
      otherFiles,
    ),
    status: statusFor(confidence, options.threshold),
  };
};

export const findValueMapping = (
  figma: FigmaToken,
  projectTokens: readonly ProjectToken[],
  nameMatch: NameMatch | null,
  isTypography: boolean,
  options: TokenJoinOptions,
  base: TokenMapping,
): TokenMapping | null => {
  const figmaHex = typeof figma.value === 'string' ? normHex(figma.value) : null;
  if (figmaHex === null) return null;
  const valueMatches = projectTokens.filter(token => normHex(token.value) === figmaHex);
  if (valueMatches.length === 0) return null;
  const scored = scoreTokens(figma, valueMatches, isTypography);
  const best = scored[0];
  if (best === undefined) return null;
  return doesNameDisambiguate(scored)
    ? createResolvedMapping(base, best, nameMatch, scored.length, options)
    : createAmbiguousMapping(base, best, scored, options);
};
