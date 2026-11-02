import type { FigmaToken } from '../tokens/figma-tokens.js';
import type { ProjectToken } from '../tokens/project-token.js';
import { diceSimilarity } from './dice-similarity.js';

const SCALE_WORDS = new Set([
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'base',
  'full',
  'default',
  'none',
  'px',
]);
const STEM_SYNONYMS: readonly ReadonlySet<string>[] = [
  new Set(['radius', 'rounded']),
  new Set(['leading', 'lineheight']),
  new Set(['fontweight', 'weight']),
];
const TYPO_STEM_SYNONYM: ReadonlySet<string> = new Set(['size', 'text']);
const TYPO_COLLECTION_WORDS = new Set([
  'font',
  'fonts',
  'typography',
  'type',
  'text',
  'typeface',
  'typo',
]);

interface ScaledName {
  stem: string;
  step: string | null;
}

export interface NameMatch {
  token: ProjectToken;
  score: number;
}

const isScaleStep = (segment: string): boolean => /^\d/.test(segment) || SCALE_WORDS.has(segment);

const splitScale = (raw: string): ScaledName => {
  const segments = raw
    .toLowerCase()
    .split(/[/\-_.\s]+/)
    .filter(Boolean);
  let cut = segments.length;
  while (cut > 0 && isScaleStep(segments[cut - 1] ?? '')) cut -= 1;
  const stepSegments = segments.slice(cut);
  return {
    stem: segments.slice(0, cut).join(''),
    step: stepSegments.length === 0 ? null : stepSegments.join('').replace(/[^a-z0-9]/g, ''),
  };
};

const isTypographyCollection = (collection: string | undefined): boolean =>
  collection !== undefined &&
  collection
    .toLowerCase()
    .split(/[^a-z]+/)
    .some(word => TYPO_COLLECTION_WORDS.has(word));

export const isFontSizeVariable = (figma: FigmaToken): boolean =>
  figma.scopes === undefined
    ? isTypographyCollection(figma.collection)
    : figma.scopes.includes('FONT_SIZE');

const stemsAlias = (left: string, right: string, isTypography: boolean): boolean =>
  left === right ||
  STEM_SYNONYMS.some(group => group.has(left) && group.has(right)) ||
  (isTypography && TYPO_STEM_SYNONYM.has(left) && TYPO_STEM_SYNONYM.has(right));

const stepGatedScore = (
  target: ScaledName,
  candidate: ScaledName,
  isTypography: boolean,
): number => {
  if ((target.step !== null || candidate.step !== null) && target.step !== candidate.step) return 0;
  if (stemsAlias(target.stem, candidate.stem, isTypography)) return 1;
  return diceSimilarity(target.stem, candidate.stem);
};

const matchNames = (token: ProjectToken): readonly string[] =>
  token.utility === undefined ? [token.name] : [token.utility, token.name];

export const nameScore = (
  figmaName: string,
  token: ProjectToken,
  isTypography: boolean,
): number => {
  const target = splitScale(figmaName);
  return Math.max(
    ...matchNames(token).map(name => stepGatedScore(target, splitScale(name), isTypography)),
  );
};

export const bestNameMatch = (
  figmaName: string,
  projectTokens: readonly ProjectToken[],
  isTypography: boolean,
): NameMatch | null => {
  let best: NameMatch | null = null;
  const scored = new Set<string>();
  for (const token of projectTokens) {
    if (scored.has(token.name)) continue;
    scored.add(token.name);
    const score = nameScore(figmaName, token, isTypography);
    if (best === null || score > best.score) best = { token, score };
  }
  return best;
};
