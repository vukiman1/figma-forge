import { z } from 'zod';

import { vectorNetworkSchema, vectorPathsSchema } from '../shared/vector-schema.js';
import type { ToolSpec } from '../tool-spec.js';

export const SET_VECTOR_TOOL_NAME = 'set_vector';

export const setVectorParams = z
  .object({
    nodeId: z.string().describe('The VECTOR to redraw'),
    vectorPaths: vectorPathsSchema.optional(),
    vectorNetwork: vectorNetworkSchema.optional(),
  })
  .refine(
    ({ vectorPaths, vectorNetwork }) =>
      (vectorPaths === undefined) !== (vectorNetwork === undefined),
    { error: 'give exactly one of vectorPaths or vectorNetwork' },
  );

export const setVectorTool: ToolSpec = {
  name: SET_VECTOR_TOOL_NAME,
  description:
    'Redraw an existing VECTOR’s geometry: vectorPaths (SVG path data) or vectorNetwork (vertices, ' +
    'segments with Bézier tangents, regions) — exactly one, in the shape get_vector reads, so read, ' +
    'edit the points, write back (paths in any SVG syntax; what reads back is Figma’s own form — ' +
    'absolute commands, its own subpath order). Coordinates are in the layer’s current space: the drawing stays ' +
    'where they put it and Figma refits the layer’s box around it, so drawing left of 0 moves the ' +
    'layer left (and an auto-layout parent re-flows to the new size). Fills, strokes, effects, a ' +
    'brush or dynamic stroke, and one cap or join the whole line had stay; a width profile is dropped when the new network branches ' +
    '(Figma allows none there). A rectangle, ellipse, polygon, star or line has to be ' +
    'flatten_nodes’d into a VECTOR first; a vector inside an instance cannot be redrawn (change ' +
    'the main component); text on a path cannot change its path. Returns { ok, nodeId }.',
  inputSchema: setVectorParams,
  kind: 'write',
};
