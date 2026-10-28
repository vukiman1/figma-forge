import type { GetVectorResult } from '@figma-forge/core';

import { serializePaint } from '../../serializer.js';

type WireNetwork = GetVectorResult['vectorNetwork'];
type WireRegion = NonNullable<WireNetwork['regions']>[number];

interface OwnerSize {
  readonly width: number;
  readonly height: number;
}

const ROUNDING = 1e4;

const round4 = (value: number): number => {
  const rounded = Math.round(value * ROUNDING) / ROUNDING;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const roundedTangent = (tangent: Vector | undefined): { x: number; y: number } | undefined =>
  tangent === undefined || (tangent.x === 0 && tangent.y === 0)
    ? undefined
    : { x: round4(tangent.x), y: round4(tangent.y) };

const serializeVertex = (vertex: VectorVertex): WireNetwork['vertices'][number] => ({
  x: round4(vertex.x),
  y: round4(vertex.y),
  ...(vertex.strokeCap !== undefined &&
    vertex.strokeCap !== 'NONE' && { strokeCap: vertex.strokeCap }),
  ...(vertex.strokeJoin !== undefined &&
    vertex.strokeJoin !== 'MITER' && { strokeJoin: vertex.strokeJoin }),
  ...(typeof vertex.cornerRadius === 'number' &&
    vertex.cornerRadius !== 0 && { cornerRadius: round4(vertex.cornerRadius) }),
  ...(vertex.handleMirroring !== undefined &&
    vertex.handleMirroring !== 'NONE' && { handleMirroring: vertex.handleMirroring }),
});

const serializeSegment = (segment: VectorSegment): WireNetwork['segments'][number] => {
  const tangentStart = roundedTangent(segment.tangentStart);
  const tangentEnd = roundedTangent(segment.tangentEnd);
  return {
    start: segment.start,
    end: segment.end,
    ...(tangentStart !== undefined && { tangentStart }),
    ...(tangentEnd !== undefined && { tangentEnd }),
  };
};

const serializeRegion = (region: VectorRegion, ownerSize: OwnerSize): WireRegion => ({
  windingRule: region.windingRule,
  loops: region.loops.map(loop => [...loop]),
  ...(region.fills !== undefined && {
    fills: region.fills.map(paint => serializePaint(paint, ownerSize)),
  }),
  ...(typeof region.fillStyleId === 'string' &&
    region.fillStyleId !== '' && { fillStyleId: region.fillStyleId }),
});

export const serializeVectorNetwork = (
  network: VectorNetwork,
  ownerSize: OwnerSize,
): WireNetwork => ({
  vertices: network.vertices.map(serializeVertex),
  segments: network.segments.map(serializeSegment),
  ...(network.regions !== undefined &&
    network.regions.length > 0 && {
      regions: network.regions.map(region => serializeRegion(region, ownerSize)),
    }),
});
