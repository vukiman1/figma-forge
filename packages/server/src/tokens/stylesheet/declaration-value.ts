import type { StylesheetCursor } from './stylesheet-cursor.js';

const END_OF_VALUE = -1;

const depthAfter = (cursor: StylesheetCursor, depth: number): number => {
  const c = cursor.char();
  if (c === '(') return depth + 1;
  if (c === ')') return Math.max(0, depth - 1);
  if (cursor.dialect.interpolation && c === '}' && depth > 0) return depth - 1;
  if (depth === 0 && (c === ';' || c === '}')) return END_OF_VALUE;
  return depth;
};

export const readDeclarationValue = (cursor: StylesheetCursor): string => {
  let value = '';
  let depth = 0;
  while (!cursor.done) {
    const opaque = cursor.readOpaque();
    if (opaque !== undefined) {
      value += opaque;
      continue;
    }
    if (cursor.atInterpolation()) {
      depth += 1;
      value += cursor.take(2);
      continue;
    }
    depth = depthAfter(cursor, depth);
    if (depth === END_OF_VALUE) break;
    value += cursor.take(1);
  }
  return value.trim().replace(cursor.dialect.flags, '').trim();
};
