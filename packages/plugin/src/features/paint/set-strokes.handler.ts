import {
  type MutateResult,
  pickDefined,
  SET_STROKES_TOOL_NAME as TOOL,
  setStrokesParams,
} from '@figma-forge/core';
import type { z } from 'zod';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';
import { toFigmaPaintsBound } from './bound-paints.js';
import { writePaints } from './write-paints.js';

type StrokeParams = z.output<typeof setStrokesParams>;

const LINE_END_FIELDS = ['strokeCap', 'strokeMiterLimit'] as const;

const PER_SIDE_FIELDS = [
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
] as const;

const STROKE_FIELDS = [
  'strokeWeight',
  'strokeAlign',
  'dashPattern',
  'strokeCap',
  'strokeJoin',
  'strokeMiterLimit',
  ...PER_SIDE_FIELDS,
] as const;

const assertSupported = (node: BaseNode, params: StrokeParams): void => {
  for (const field of LINE_END_FIELDS) {
    if (params[field] !== undefined && !(field in node)) {
      throw new Error(`${TOOL}: a ${node.type} has no ${field} — it has no line ends to shape`);
    }
  }
  if (PER_SIDE_FIELDS.some(side => params[side] !== undefined && !(side in node))) {
    throw new Error(`${TOOL}: node ${params.nodeId} does not support per-side stroke weights`);
  }
};

export const createSetStrokesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, setStrokesParams, raw);
    const node = await requireNodeWith(
      figmaCtx,
      TOOL,
      params.nodeId,
      'strokes',
      'cannot have strokes',
    );
    assertSupported(node, params);
    await writePaints(node, 'strokes', await toFigmaPaintsBound(figmaCtx, params.strokes, TOOL));
    for (const [field, value] of Object.entries(pickDefined(params, STROKE_FIELDS))) {
      Reflect.set(node, field, value);
    }
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
