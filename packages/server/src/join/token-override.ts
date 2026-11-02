import type { ProjectToken } from '../tokens/project-token.js';
import { casefold } from './casefold.js';
import { parseMapLine } from './map-file.js';

const normalizeReference = (value: string): string =>
  casefold(value.replace(/^var\(\s*|\s*\)$/g, ''));

export const resolveOverrideToken = (
  reference: string,
  projectTokens: readonly ProjectToken[],
): ProjectToken | undefined => {
  const wanted = normalizeReference(reference);
  return projectTokens.find(token =>
    [token.name, token.cssVar, token.utility, token.scssVar].some(
      identity => identity !== undefined && normalizeReference(identity) === wanted,
    ),
  );
};

export const parseTokenMapFile = (markdown: string): Map<string, string> => {
  const mappings = new Map<string, string>();
  for (const line of markdown.split('\n')) {
    const row = parseMapLine(line);
    if (row === null) continue;
    const [figmaName, reference] = row;
    mappings.set(figmaName, reference);
    mappings.set(casefold(figmaName), reference);
  }
  return mappings;
};
