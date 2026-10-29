export const UNLIMITED_DEPTH = -1;

export const depthBelow = (remainingDepth: number): number =>
  remainingDepth === UNLIMITED_DEPTH ? UNLIMITED_DEPTH : remainingDepth - 1;

export const depthFromParam = (depth: number | undefined): number =>
  depth !== undefined && depth > 0 ? depth : UNLIMITED_DEPTH;
