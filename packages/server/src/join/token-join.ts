import type { FigmaToken } from '../tokens/figma-tokens.js';
import type { ProjectToken } from '../tokens/project-token.js';
import { casefold } from './casefold.js';
import { findTailwindBuiltinToken } from './tailwind-builtin-token.js';
import { createTokenCandidate } from './token-candidate.js';
import { findOtherTokenFiles } from './token-file-ambiguity.js';
import type { TokenJoinOptions, TokenMapping } from './token-mapping.js';
import { findNameMapping } from './token-name-mapping.js';
import { bestNameMatch, isFontSizeVariable } from './token-name-match.js';
import { resolveOverrideToken } from './token-override.js';
import { findValueMapping } from './token-value-match.js';

const createBaseMapping = (figma: FigmaToken): TokenMapping => ({
  figmaName: figma.name,
  figmaValue: figma.value,
  figmaType: figma.type,
  ...(figma.modes === undefined ? {} : { figmaModes: figma.modes }),
  ...(figma.source === undefined ? {} : { source: figma.source }),
  status: 'unmapped',
});

const scanToken = (
  figma: FigmaToken,
  projectTokens: readonly ProjectToken[],
  options: TokenJoinOptions,
  base: TokenMapping,
): TokenMapping => {
  const isTypography = isFontSizeVariable(figma);
  const nameMatch = bestNameMatch(figma.name, projectTokens, isTypography);
  const valueMapping = findValueMapping(
    figma,
    projectTokens,
    nameMatch,
    isTypography,
    options,
    base,
  );
  if (valueMapping !== null) return valueMapping;
  const nameMapping = findNameMapping(figma, projectTokens, nameMatch, options, base);
  if (nameMapping !== null) return nameMapping;
  const builtin = options.utilityFirst === true ? findTailwindBuiltinToken(figma.name) : null;
  return builtin === null ? base : { ...base, builtin, status: 'framework-builtin' };
};

const createOverrideMapping = (
  token: ProjectToken,
  projectTokens: readonly ProjectToken[],
  options: TokenJoinOptions,
  base: TokenMapping,
): TokenMapping => {
  const otherFiles = findOtherTokenFiles(token, projectTokens);
  const confidence = otherFiles.length > 0 ? 0.7 : 1;
  return {
    ...base,
    candidate: createTokenCandidate(
      token,
      confidence,
      ['map-file'],
      options.utilityFirst === true,
      [],
      otherFiles,
    ),
    status: otherFiles.length > 0 ? 'medium' : 'high',
  };
};

const joinToken = (
  figma: FigmaToken,
  projectTokens: readonly ProjectToken[],
  options: TokenJoinOptions,
): TokenMapping => {
  const base = createBaseMapping(figma);
  const reference =
    options.overrides?.get(figma.name) ?? options.overrides?.get(casefold(figma.name));
  if (reference === undefined) return scanToken(figma, projectTokens, options, base);
  const token = resolveOverrideToken(reference, projectTokens);
  if (token !== undefined) return createOverrideMapping(token, projectTokens, options, base);
  return {
    ...scanToken(figma, projectTokens, options, base),
    staleOverride: { ref: reference },
  };
};

export const joinTokens = (
  figmaTokens: readonly FigmaToken[],
  projectTokens: readonly ProjectToken[],
  options: TokenJoinOptions,
): TokenMapping[] => figmaTokens.map(figma => joinToken(figma, projectTokens, options));
