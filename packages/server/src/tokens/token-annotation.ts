import type {
  GetDesignContextResult,
  ProjectTokenAnnotation,
  ProjectTokenMatch,
} from '@figma-forge/core';

import { normHex } from './hex.js';
import { type ProjectToken, refOf } from './project-token.js';
import type { TokenValueIndex } from './token-value-index.js';

const MAX_CANDIDATES = 3;
const HEX_VALUE = /^#[0-9a-fA-F]{3,8}$/;

const toMatch = (token: ProjectToken, utilityFirst: boolean): ProjectTokenMatch => ({
  ref: refOf(token, utilityFirst),
  name: token.name,
  ...(token.from === undefined ? {} : { from: token.from }),
});

const collectHexStrings = (value: unknown, found: Set<string>): void => {
  if (typeof value === 'string') {
    if (HEX_VALUE.test(value.trim())) found.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectHexStrings(item, found);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const item of Object.values(value)) collectHexStrings(item, found);
};

const annotationFor = (
  tokens: readonly ProjectToken[],
  utilityFirst: boolean,
): ProjectTokenAnnotation | undefined => {
  if (tokens.length === 0 || tokens.length > MAX_CANDIDATES) return undefined;
  const first = tokens.at(0);
  if (tokens.length === 1 && first !== undefined)
    return { ...toMatch(first, utilityFirst), matchedBy: ['value'] };
  const candidates = tokens
    .map(token => toMatch(token, utilityFirst))
    .toSorted((a, b) => a.name.localeCompare(b.name));
  return { matchedBy: ['value'], candidates };
};

export const annotateProjectTokens = (
  result: GetDesignContextResult,
  index: TokenValueIndex,
  utilityFirst: boolean,
): GetDesignContextResult => {
  if (index.size === 0) return result;
  const found = new Set<string>();
  collectHexStrings(result.nodes, found);
  if (result.globalVars !== undefined) collectHexStrings(result.globalVars, found);
  const annotations: Record<string, ProjectTokenAnnotation> = {};
  for (const raw of found) {
    const hex = normHex(raw);
    if (hex === null) continue;
    const annotation = annotationFor(index.get(hex) ?? [], utilityFirst);
    if (annotation !== undefined) annotations[raw] = annotation;
  }
  return Object.keys(annotations).length === 0 ? result : { ...result, projectTokens: annotations };
};
