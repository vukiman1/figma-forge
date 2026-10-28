import { z } from 'zod';

import { paintItemSchema } from '../shared/paint-schema.js';

const point = z.object({ x: z.number(), y: z.number() });

interface IndexedNetwork {
  readonly vertices: readonly unknown[];
  readonly segments: readonly { readonly start: number; readonly end: number }[];
  readonly regions?: readonly { readonly loops: readonly (readonly number[])[] }[] | undefined;
}

const SEGMENT_ENDS = ['start', 'end'] as const;

const requireVertexIndices = (network: IndexedNetwork, ctx: z.RefinementCtx): void => {
  const count = network.vertices.length;
  network.segments.forEach((segment, index) => {
    for (const end of SEGMENT_ENDS.filter(name => segment[name] >= count)) {
      ctx.addIssue({
        code: 'custom',
        path: ['segments', index, end],
        message: `must name one of the ${count} vertices (0–${count - 1})`,
      });
    }
  });
};

const requireSegmentIndices = (network: IndexedNetwork, ctx: z.RefinementCtx): void => {
  const count = network.segments.length;
  (network.regions ?? []).forEach((region, index) => {
    if (region.loops.every(loop => loop.every(segment => segment < count))) return;
    ctx.addIssue({
      code: 'custom',
      path: ['regions', index, 'loops'],
      message: `must list segment indices (0–${count - 1})`,
    });
  });
};

export const vectorPathsSchema = z
  .array(
    z.object({
      windingRule: z
        .enum(['NONZERO', 'EVENODD', 'NONE'])
        .describe(
          'How the path fills: NONZERO / EVENODD for a closed shape, NONE for an open line',
        ),
      data: z
        .string()
        .min(1)
        .refine(data => data.trim() !== '', { error: 'must be SVG path data' })
        .describe(
          'SVG path data in any syntax — relative commands, H / V, S / T, arcs and minified icon paths ' +
            'included; it is rewritten into the absolute M / L / C / Q / Z form Figma stores',
        ),
    }),
  )
  .min(1)
  .describe(
    'Path data with its winding rule; one entry may hold several subpaths (each M starts one)',
  );

export const vectorNetworkSchema = z
  .object({
    vertices: z
      .array(
        z.object({
          x: z.number(),
          y: z.number(),
          strokeCap: z
            .enum([
              'NONE',
              'ROUND',
              'SQUARE',
              'ARROW_LINES',
              'ARROW_EQUILATERAL',
              'DIAMOND_FILLED',
              'TRIANGLE_FILLED',
              'CIRCLE_FILLED',
            ])
            .describe('The end cap drawn at this vertex when it ends an open path (an arrowhead)')
            .optional(),
          strokeJoin: z.enum(['MITER', 'BEVEL', 'ROUND']).optional(),
          cornerRadius: z.number().min(0).describe('Rounds the corner at this vertex').optional(),
          handleMirroring: z.enum(['NONE', 'ANGLE', 'ANGLE_AND_LENGTH']).optional(),
        }),
      )
      .min(1),
    segments: z.array(
      z.object({
        start: z.number().int().min(0).describe('Index of the vertex it starts at'),
        end: z.number().int().min(0).describe('Index of the vertex it ends at'),
        tangentStart: point
          .describe('Bézier handle at the start, relative to that vertex ({0,0} = straight)')
          .optional(),
        tangentEnd: point.describe('Bézier handle at the end, relative to that vertex').optional(),
      }),
    ),
    regions: z
      .array(
        z.object({
          windingRule: z.enum(['NONZERO', 'EVENODD']),
          loops: z
            .array(z.array(z.number().int().min(0)))
            .describe('Each loop lists the segment indices that close it, in order'),
          fills: z
            .array(paintItemSchema)
            .describe('This region’s own fills (otherwise the node’s fills apply)')
            .optional(),
        }),
      )
      .describe('Closed areas that take a fill; omit for a stroke-only drawing')
      .optional(),
  })
  .superRefine(requireVertexIndices)
  .superRefine(requireSegmentIndices)
  .describe(
    'Vertices joined by segments — unlike SVG paths, a vertex may join three or more segments (a ' +
      'branching drawing). Each segment may curve through Bézier tangents.',
  );
