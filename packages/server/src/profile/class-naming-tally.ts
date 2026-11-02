import type { StylesheetNames } from './stylesheet-names.js';
import { isTransitionSuffix } from './transition-names.js';

export interface ClassNamingTally {
  readonly ampersand: number;
  readonly flat: number;
  readonly filesScanned: number;
  readonly omitted: number;
}

export type ClassNamingVotes = Pick<ClassNamingTally, 'ampersand' | 'flat'>;

const BEM_PUNCTUATED = /(?:__|--)[A-Za-z0-9_-]/;
const COMPOUND_SEPARATORS: ReadonlySet<string> = new Set(['-', '_']);
const LEADING_SEPARATORS = /^[-_]+/;

const isCompoundClassName = (name: string, declared: ReadonlySet<string>): boolean => {
  if (BEM_PUNCTUATED.test(name)) return true;
  for (let at = 1; at < name.length; at += 1) {
    if (!COMPOUND_SEPARATORS.has(name.charAt(at)) || !declared.has(name.slice(0, at))) continue;
    return !isTransitionSuffix(name.slice(at).replace(LEADING_SEPARATORS, ''));
  }
  return false;
};

export const tallyClassNaming = (files: Iterable<StylesheetNames>): ClassNamingVotes => {
  const all = [...files];
  const occurrences = all.flatMap(file => file.topLevel);
  const declared = new Set(occurrences);
  return {
    ampersand: all.reduce((sum, file) => sum + file.ampersand, 0),
    flat: occurrences.filter(name => isCompoundClassName(name, declared)).length,
  };
};
