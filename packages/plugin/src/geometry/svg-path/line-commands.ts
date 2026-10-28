import type { PathScanner } from './path-scanner.js';
import { emitSegment, ensureOpen, type PathState } from './path-state.js';
import type { Point } from './point.js';

export const readPoint = (scanner: PathScanner, origin: Point): Point => {
  const x = origin.x + scanner.readNumber();
  const y = origin.y + scanner.readNumber();
  return { x, y };
};

export const moveTo = (path: PathState, scanner: PathScanner, origin: Point): null => {
  const point = readPoint(scanner, origin);
  path.current = point;
  path.subpathStart = point;
  emitSegment(path, 'M', [point]);
  path.isOpen = true;
  return null;
};

const drawLine = (path: PathState, end: Point): null => {
  ensureOpen(path);
  path.current = end;
  emitSegment(path, 'L', [end]);
  return null;
};

export const lineTo = (path: PathState, scanner: PathScanner, origin: Point): null =>
  drawLine(path, readPoint(scanner, origin));

export const horizontalLineTo = (path: PathState, scanner: PathScanner, origin: Point): null => {
  const x = origin.x + scanner.readNumber();
  return drawLine(path, { x, y: path.current.y });
};

export const verticalLineTo = (path: PathState, scanner: PathScanner, origin: Point): null => {
  const y = origin.y + scanner.readNumber();
  return drawLine(path, { x: path.current.x, y });
};

export const closePath = (path: PathState): null => {
  if (path.isOpen) path.segments.push('Z');
  path.current = path.subpathStart;
  path.isOpen = false;
  return null;
};
