import type { z } from 'zod';

import { parseParams } from '../parse-params.js';

export interface Move {
  readonly nodeIds: readonly string[];
  readonly destinationId: string | null;
}

export type UndoNote = string | undefined;

export interface CapturedOp {
  readonly undo: (result: unknown) => Promise<UndoNote>;
  readonly touches: readonly string[];
  readonly resizes: readonly string[];
}

export interface BatchInverse {
  readonly capture: (figmaCtx: typeof figma, params: unknown) => Promise<CapturedOp>;
  readonly moves?: (figmaCtx: typeof figma, params: unknown) => Promise<Move>;
}

export interface InverseSpec<P, S> {
  readonly capture: (figmaCtx: typeof figma, params: P) => Promise<S>;
  readonly undo: (figmaCtx: typeof figma, state: S, result: unknown) => Promise<UndoNote>;
  readonly touches?: (state: S) => readonly string[];
  readonly resizes?: (state: S) => readonly string[];
  readonly moves?: (figmaCtx: typeof figma, params: P) => Promise<Move>;
}

export const batchTool = (tool: string): string => `batch/${tool}`;

export const defineInverse = <Schema extends z.ZodType, State>(
  tool: string,
  schema: Schema,
  spec: InverseSpec<z.output<Schema>, State>,
): BatchInverse => {
  const parse = (raw: unknown): z.output<Schema> => parseParams(batchTool(tool), schema, raw);
  const { moves } = spec;
  return {
    capture: async (figmaCtx, raw) => {
      const state = await spec.capture(figmaCtx, parse(raw));
      return {
        undo: async result => spec.undo(figmaCtx, state, result),
        touches: spec.touches?.(state) ?? [],
        resizes: spec.resizes?.(state) ?? [],
      };
    },
    ...(moves !== undefined && {
      moves: async (figmaCtx: typeof figma, raw: unknown) => moves(figmaCtx, parse(raw)),
    }),
  };
};
