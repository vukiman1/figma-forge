import type { Point } from './point.js';

export interface EndpointArc {
  readonly start: Point;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly rotationDegrees: number;
  readonly isLargeArc: boolean;
  readonly isSweep: boolean;
  readonly end: Point;
}

export interface CubicSegment {
  readonly control1: Point;
  readonly control2: Point;
  readonly end: Point;
}

export type ArcShape =
  | { readonly kind: 'none' }
  | { readonly kind: 'line' }
  | { readonly kind: 'cubics'; readonly segments: readonly CubicSegment[] };

interface CenterArc {
  readonly center: Point;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly cos: number;
  readonly sin: number;
  readonly startAngle: number;
  readonly sweepAngle: number;
}

const DEGREES_PER_HALF_TURN = 180;
const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = 2 * Math.PI;
const SEGMENT_COUNT_TOLERANCE = 1e-9;

const angleBetween = (ux: number, uy: number, vx: number, vy: number): number =>
  Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);

const reachableRadii = (rx: number, ry: number, x1p: number, y1p: number): [number, number] => {
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) return [rx * Math.sqrt(lambda), ry * Math.sqrt(lambda)];
  return [rx, ry];
};

const signedSweep = (delta: number, isSweep: boolean): number => {
  if (!isSweep && delta > 0) return delta - FULL_TURN;
  if (isSweep && delta < 0) return delta + FULL_TURN;
  return delta;
};

const toCenterArc = (arc: EndpointArc): CenterArc => {
  const { start, end } = arc;
  const phi = (arc.rotationDegrees * Math.PI) / DEGREES_PER_HALF_TURN;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (start.x - end.x) / 2;
  const dy = (start.y - end.y) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const [rx, ry] = reachableRadii(Math.abs(arc.radiusX), Math.abs(arc.radiusY), x1p, y1p);
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (arc.isLargeArc === arc.isSweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  return {
    center: {
      x: cos * cxp - sin * cyp + (start.x + end.x) / 2,
      y: sin * cxp + cos * cyp + (start.y + end.y) / 2,
    },
    radiusX: rx,
    radiusY: ry,
    cos,
    sin,
    startAngle: angleBetween(1, 0, ux, uy),
    sweepAngle: signedSweep(
      angleBetween(ux, uy, (-x1p - cxp) / rx, (-y1p - cyp) / ry),
      arc.isSweep,
    ),
  };
};

const pointAt = (arc: CenterArc, t: number): Point => ({
  x: arc.center.x + arc.radiusX * Math.cos(t) * arc.cos - arc.radiusY * Math.sin(t) * arc.sin,
  y: arc.center.y + arc.radiusX * Math.cos(t) * arc.sin + arc.radiusY * Math.sin(t) * arc.cos,
});

const derivativeAt = (arc: CenterArc, t: number): Point => ({
  x: -arc.radiusX * Math.sin(t) * arc.cos - arc.radiusY * Math.cos(t) * arc.sin,
  y: -arc.radiusX * Math.sin(t) * arc.sin + arc.radiusY * Math.cos(t) * arc.cos,
});

const toCubicSegments = (arc: CenterArc, end: Point): CubicSegment[] => {
  const parts = Math.max(
    1,
    Math.ceil(Math.abs(arc.sweepAngle) / QUARTER_TURN - SEGMENT_COUNT_TOLERANCE),
  );
  const step = arc.sweepAngle / parts;
  const k = (4 / 3) * Math.tan(step / 4);
  const segments: CubicSegment[] = [];
  for (let i = 0; i < parts; i++) {
    const a = arc.startAngle + i * step;
    const b = a + step;
    const from = pointAt(arc, a);
    const to = i === parts - 1 ? end : pointAt(arc, b);
    const fromSlope = derivativeAt(arc, a);
    const toSlope = derivativeAt(arc, b);
    segments.push({
      control1: { x: from.x + k * fromSlope.x, y: from.y + k * fromSlope.y },
      control2: { x: to.x - k * toSlope.x, y: to.y - k * toSlope.y },
      end: to,
    });
  }
  return segments;
};

export const arcToCubics = (arc: EndpointArc): ArcShape => {
  if (arc.start.x === arc.end.x && arc.start.y === arc.end.y) return { kind: 'none' };
  if (arc.radiusX === 0 || arc.radiusY === 0) return { kind: 'line' };
  return { kind: 'cubics', segments: toCubicSegments(toCenterArc(arc), arc.end) };
};
