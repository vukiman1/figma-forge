import type { alignNodesParams } from '@figma-forge/core';
import type { z } from 'zod';

import type { AlignTarget } from './align-target.js';
import { mapVector, type Vector } from './linear-map.js';
import type { Box } from './node-box.js';

type AlignParams = z.output<typeof alignNodesParams>;
type Edge = NonNullable<AlignParams['horizontal']>;
type Axis = NonNullable<AlignParams['distribute']>;

export interface AlignEdges {
  readonly horizontal: Edge | undefined;
  readonly vertical: Edge | undefined;
}

interface Span {
  readonly start: number;
  readonly size: number;
}

const placeOnEdge = (edge: Edge, reference: Span, size: number): number => {
  if (edge === 'MIN') return reference.start;
  if (edge === 'CENTER') return reference.start + (reference.size - size) / 2;
  return reference.start + reference.size - size;
};

const offsetAlong = (edge: Edge | undefined, reference: Span, own: Span): number =>
  edge === undefined ? 0 : placeOnEdge(edge, reference, own.size) - own.start;

const horizontalSpan = (box: Box): Span => ({ start: box.x, size: box.width });
const verticalSpan = (box: Box): Span => ({ start: box.y, size: box.height });

export const alignmentOffset = (
  target: AlignTarget,
  reference: Box | null,
  edges: AlignEdges,
): Vector => {
  if (reference === null) return [0, 0];
  const dx = offsetAlong(edges.horizontal, horizontalSpan(reference), horizontalSpan(target.box));
  const dy = offsetAlong(edges.vertical, verticalSpan(reference), verticalSpan(target.box));
  return mapVector(target.space, [dx, dy]);
};

const distributedStarts = (spans: readonly Span[]): number[] => {
  const order = spans
    .map((_span, index) => index)
    .toSorted((i, j) => spans[i]!.start - spans[j]!.start);
  const first = spans[order[0]!]!;
  const last = spans[order.at(-1)!]!;
  const used = spans.reduce((sum, span) => sum + span.size, 0);
  const gap = (last.start + last.size - first.start - used) / (spans.length - 1);
  const starts = spans.map(span => span.start);
  let cursor = first.start;
  for (const index of order) {
    starts[index] = cursor;
    cursor += spans[index]!.size + gap;
  }
  return starts;
};

export const distributionOffsets = (boxes: readonly Box[], axis: Axis): Vector[] => {
  const isHorizontal = axis === 'HORIZONTAL';
  const spans = boxes.map(isHorizontal ? horizontalSpan : verticalSpan);
  return distributedStarts(spans).map((start, index): Vector => {
    const offset = start - spans[index]!.start;
    return isHorizontal ? [offset, 0] : [0, offset];
  });
};
