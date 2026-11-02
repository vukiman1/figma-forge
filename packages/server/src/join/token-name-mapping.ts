import type { FigmaToken } from '../tokens/figma-tokens.js';
import { normHex } from '../tokens/hex.js';
import type { ProjectToken } from '../tokens/project-token.js';
import { statusFor } from './status.js';
import { createTokenCandidate } from './token-candidate.js';
import { findOtherTokenFiles } from './token-file-ambiguity.js';
import type { TokenJoinOptions, TokenMapping } from './token-mapping.js';
import type { NameMatch } from './token-name-match.js';

const findConfidence = (
  figma: FigmaToken,
  nameMatch: NameMatch,
  hasFileAmbiguity: boolean,
): number => {
  const figmaHex = typeof figma.value === 'string' ? normHex(figma.value) : null;
  const candidateHex = normHex(nameMatch.token.value);
  const doesValueDisagree = figmaHex !== null && candidateHex !== null && candidateHex !== figmaHex;
  const valueConfidence = doesValueDisagree ? Math.min(nameMatch.score, 0.84) : nameMatch.score;
  return Math.min(valueConfidence, hasFileAmbiguity ? 0.7 : 1);
};

export const findNameMapping = (
  figma: FigmaToken,
  projectTokens: readonly ProjectToken[],
  nameMatch: NameMatch | null,
  options: TokenJoinOptions,
  base: TokenMapping,
): TokenMapping | null => {
  if (nameMatch === null || nameMatch.score < 0.5) return null;
  const otherFiles = findOtherTokenFiles(nameMatch.token, projectTokens);
  const confidence = findConfidence(figma, nameMatch, otherFiles.length > 0);
  return {
    ...base,
    candidate: createTokenCandidate(
      nameMatch.token,
      confidence,
      ['name'],
      options.utilityFirst === true,
      [],
      otherFiles,
    ),
    status: statusFor(confidence, options.threshold),
  };
};
