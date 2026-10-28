import { pickDefined, type vectorNetworkSchema, type vectorPathsSchema } from '@figma-forge/core';
import type { z } from 'zod';

import { toFigmaPathData } from '../../svg-path.js';
import { errorMessage } from '../error-message.js';
import { toFigmaPaintsBound } from '../paint/bound-paints.js';

type WirePaths = z.output<typeof vectorPathsSchema>;
type WireNetwork = z.output<typeof vectorNetworkSchema>;
type WireRegion = NonNullable<WireNetwork['regions']>[number];
type WireVertex = WireNetwork['vertices'][number];
type WireSegment = WireNetwork['segments'][number];

const VERTEX_STYLE_FIELDS = ['strokeCap', 'strokeJoin', 'cornerRadius', 'handleMirroring'] as const;
const SEGMENT_TANGENT_FIELDS = ['tangentStart', 'tangentEnd'] as const;

interface GeometryParams {
  readonly vectorPaths?: WirePaths | undefined;
  readonly vectorNetwork?: WireNetwork | undefined;
}

export type VectorGeometry =
  | { readonly kind: 'paths'; readonly paths: VectorPaths }
  | { readonly kind: 'network'; readonly network: VectorNetwork };

export class InvalidPathDataError extends SyntaxError {
  override readonly name = 'InvalidPathDataError';
}

const toFigmaPaths = (paths: WirePaths, tool: string): VectorPaths =>
  paths.map(({ windingRule, data }, index) => {
    try {
      return { windingRule, data: toFigmaPathData(data) };
    } catch (error) {
      throw new InvalidPathDataError(
        `${tool}: vectorPaths[${index}].data is not valid SVG path data: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  });

const toFigmaRegion = async (
  figmaCtx: typeof figma,
  { windingRule, loops, fills }: WireRegion,
  tool: string,
): Promise<VectorRegion> => ({
  windingRule,
  loops: loops.map(loop => [...loop]),
  ...(fills !== undefined && { fills: await toFigmaPaintsBound(figmaCtx, fills, tool) }),
});

const toFigmaVertex = (vertex: WireVertex): VectorVertex => ({
  x: vertex.x,
  y: vertex.y,
  ...pickDefined(vertex, VERTEX_STYLE_FIELDS),
});

const toFigmaSegment = (segment: WireSegment): VectorSegment => ({
  start: segment.start,
  end: segment.end,
  ...pickDefined(segment, SEGMENT_TANGENT_FIELDS),
});

const toFigmaNetwork = async (
  figmaCtx: typeof figma,
  { vertices, segments, regions }: WireNetwork,
  tool: string,
): Promise<VectorNetwork> => ({
  vertices: vertices.map(toFigmaVertex),
  segments: segments.map(toFigmaSegment),
  ...(regions !== undefined && {
    regions: await Promise.all(regions.map(async region => toFigmaRegion(figmaCtx, region, tool))),
  }),
});

export const toVectorGeometry = async (
  figmaCtx: typeof figma,
  { vectorPaths, vectorNetwork }: GeometryParams,
  tool: string,
): Promise<VectorGeometry> => {
  if (vectorPaths !== undefined) return { kind: 'paths', paths: toFigmaPaths(vectorPaths, tool) };
  if (vectorNetwork === undefined) {
    throw new TypeError(`${tool}: give exactly one of vectorPaths or vectorNetwork`);
  }
  return { kind: 'network', network: await toFigmaNetwork(figmaCtx, vectorNetwork, tool) };
};

export const drawGeometry = async (node: VectorNode, geometry: VectorGeometry): Promise<void> => {
  if (geometry.kind === 'paths') node.vectorPaths = geometry.paths;
  else await node.setVectorNetworkAsync(geometry.network);
};
