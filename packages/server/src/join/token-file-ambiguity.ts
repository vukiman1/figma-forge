import type { ProjectToken } from '../tokens/project-token.js';

export const findOtherTokenFiles = (
  token: ProjectToken,
  projectTokens: readonly ProjectToken[],
): string[] =>
  token.from === undefined
    ? []
    : projectTokens.flatMap(candidate =>
        candidate.name === token.name &&
        candidate.from !== undefined &&
        candidate.from !== token.from
          ? [candidate.from]
          : [],
      );
