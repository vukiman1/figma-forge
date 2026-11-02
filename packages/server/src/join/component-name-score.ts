import type { ScannedComponent } from '../scan/scanned-component.js';
import { casefold } from './casefold.js';
import { diceSimilarity } from './dice-similarity.js';

const VARIANT_NAMED = /=/;

export interface ComponentNameScore {
  component: ScannedComponent;
  score: number;
}

const findNameCandidates = (figmaName: string): string[] => {
  const parts = figmaName
    .split('/')
    .map(part => part.trim())
    .filter(part => part.length > 0 && !VARIANT_NAMED.test(part));
  const base = VARIANT_NAMED.test(figmaName)
    ? undefined
    : (figmaName.split(',')[0]?.trim() ?? figmaName);
  return [...new Set([figmaName, ...(base === undefined ? [] : [base]), ...parts])];
};

const scoreComponent = (
  candidates: readonly string[],
  component: ScannedComponent,
): ComponentNameScore => {
  const target = casefold(component.name);
  const score = Math.max(...candidates.map(candidate => diceSimilarity(candidate, target)));
  return { component, score };
};

export const scoreComponentNames = (
  figmaName: string,
  scanned: readonly ScannedComponent[],
): ComponentNameScore[] => {
  const candidates = findNameCandidates(figmaName).map(casefold);
  return scanned.map(component => scoreComponent(candidates, component));
};

export const findBestComponentScore = (
  scores: readonly ComponentNameScore[],
): ComponentNameScore | null => {
  let winner: ComponentNameScore | null = null;
  for (const score of scores) {
    if (winner === null || score.score > winner.score) winner = score;
  }
  return winner;
};
