import { SEGMENT_FIELDS } from '../../handlers/batch-snapshot.js';
import type { TextLike } from './text-like.js';

export const replaceRange = (
  text: TextLike,
  start: number,
  end: number,
  replacement: string,
): void => {
  if (replacement.length > 0) {
    text.insertCharacters(start, replacement, start < end ? 'AFTER' : 'BEFORE');
  }
  if (end > start) {
    text.deleteCharacters(start + replacement.length, end + replacement.length);
  }
};

const sharedEdges = (a: string, b: string): { prefix: number; suffix: number } => {
  const limit = Math.min(a.length, b.length);
  let prefix = 0;
  while (prefix < limit && a.charCodeAt(prefix) === b.charCodeAt(prefix)) prefix += 1;
  let suffix = 0;
  while (
    suffix < limit - prefix &&
    a.charCodeAt(a.length - 1 - suffix) === b.charCodeAt(b.length - 1 - suffix)
  ) {
    suffix += 1;
  }
  return { prefix, suffix };
};

export const keptEdges = (text: TextLike, next: string): { prefix: number; suffix: number } => {
  const before = text.characters;
  const { prefix, suffix } = sharedEdges(before, next);
  const starts = text.getStyledTextSegments([...SEGMENT_FIELDS]).map(run => run.start);
  const bounds = [...starts, before.length];
  const keptPrefix = Math.max(0, ...bounds.filter(b => b <= prefix));
  const suffixStart = before.length - suffix;
  const keptSuffixStart = Math.min(before.length, ...bounds.filter(b => b >= suffixStart));
  return { prefix: keptPrefix, suffix: before.length - keptSuffixStart };
};
