import { arcToCubics, type EndpointArc } from './arc-to-cubics.js';
import { readPoint } from './line-commands.js';
import type { PathScanner } from './path-scanner.js';
import {
  emitSegment,
  ensureOpen,
  type ControlHandle,
  type HandleKind,
  type PathState,
} from './path-state.js';
import type { Point } from './point.js';

const reflectedHandle = (path: PathState, kind: HandleKind): Point => {
  const { current, lastHandle } = path;
  if (lastHandle?.kind !== kind) return current;
  return { x: 2 * current.x - lastHandle.point.x, y: 2 * current.y - lastHandle.point.y };
};

const drawCubic = (
  path: PathState,
  control1: Point,
  control2: Point,
  end: Point,
): ControlHandle => {
  ensureOpen(path);
  path.current = end;
  emitSegment(path, 'C', [control1, control2, end]);
  return { kind: 'cubic', point: control2 };
};

const drawQuad = (path: PathState, control: Point, end: Point): ControlHandle => {
  ensureOpen(path);
  path.current = end;
  emitSegment(path, 'Q', [control, end]);
  return { kind: 'quad', point: control };
};

export const cubicTo = (path: PathState, scanner: PathScanner, origin: Point): ControlHandle => {
  const control1 = readPoint(scanner, origin);
  const control2 = readPoint(scanner, origin);
  return drawCubic(path, control1, control2, readPoint(scanner, origin));
};

export const smoothCubicTo = (
  path: PathState,
  scanner: PathScanner,
  origin: Point,
): ControlHandle => {
  const control2 = readPoint(scanner, origin);
  const end = readPoint(scanner, origin);
  return drawCubic(path, reflectedHandle(path, 'cubic'), control2, end);
};

export const quadTo = (path: PathState, scanner: PathScanner, origin: Point): ControlHandle => {
  const control = readPoint(scanner, origin);
  return drawQuad(path, control, readPoint(scanner, origin));
};

export const smoothQuadTo = (path: PathState, scanner: PathScanner, origin: Point): ControlHandle =>
  drawQuad(path, reflectedHandle(path, 'quad'), readPoint(scanner, origin));

const readArc = (scanner: PathScanner, start: Point, origin: Point): EndpointArc => ({
  start,
  radiusX: scanner.readNumber(),
  radiusY: scanner.readNumber(),
  rotationDegrees: scanner.readNumber(),
  isLargeArc: scanner.readFlag(),
  isSweep: scanner.readFlag(),
  end: readPoint(scanner, origin),
});

export const arcTo = (path: PathState, scanner: PathScanner, origin: Point): null => {
  const arc = readArc(scanner, path.current, origin);
  const shape = arcToCubics(arc);
  ensureOpen(path);
  if (shape.kind === 'line') emitSegment(path, 'L', [arc.end]);
  if (shape.kind === 'cubics') {
    for (const { control1, control2, end } of shape.segments) {
      emitSegment(path, 'C', [control1, control2, end]);
    }
  }
  path.current = arc.end;
  return null;
};
