import { formatNumber } from './format-number.js';
import { ORIGIN, type Point } from './point.js';

export type HandleKind = 'cubic' | 'quad';

export interface ControlHandle {
  readonly kind: HandleKind;
  readonly point: Point;
}

export interface PathState {
  readonly segments: string[];
  current: Point;
  subpathStart: Point;
  lastHandle: ControlHandle | null;
  isOpen: boolean;
}

export const createPathState = (): PathState => ({
  segments: [],
  current: ORIGIN,
  subpathStart: ORIGIN,
  lastHandle: null,
  isOpen: false,
});

export const emitSegment = (path: PathState, op: string, points: readonly Point[]): void => {
  const numbers = points.flatMap(({ x, y }) => [x, y]).map(formatNumber);
  path.segments.push(`${op} ${numbers.join(' ')}`);
};

export const ensureOpen = (path: PathState): void => {
  if (path.isOpen) return;
  emitSegment(path, 'M', [path.current]);
  path.isOpen = true;
};
