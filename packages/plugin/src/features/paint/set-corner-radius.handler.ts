import {
  type MutateResult,
  pickDefined,
  SET_CORNER_RADIUS_TOOL_NAME as TOOL,
  setCornerRadiusParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';

const PER_CORNER_FIELDS = [
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
] as const;

export const createSetCornerRadiusHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, radius, cornerSmoothing, ...rest } = parseParams(
      TOOL,
      setCornerRadiusParams,
      raw,
    );
    const corners = pickDefined(rest, PER_CORNER_FIELDS);
    if (
      radius === undefined &&
      cornerSmoothing === undefined &&
      Object.keys(corners).length === 0
    ) {
      throw new TypeError(`${TOOL}: provide radius, a corner radius or cornerSmoothing`);
    }
    const node = await requireNodeWith(
      figmaCtx,
      TOOL,
      nodeId,
      'cornerRadius',
      'has no cornerRadius',
    );
    if (cornerSmoothing !== undefined && !('cornerSmoothing' in node)) {
      throw new Error(`${TOOL}: node ${nodeId} does not support cornerSmoothing`);
    }
    if (Object.keys(corners).some(corner => !(corner in node))) {
      throw new Error(`${TOOL}: node ${nodeId} does not support per-corner radii`);
    }
    if (radius !== undefined) Reflect.set(node, 'cornerRadius', radius);
    for (const [corner, value] of Object.entries(corners)) Reflect.set(node, corner, value);
    if (cornerSmoothing !== undefined) Reflect.set(node, 'cornerSmoothing', cornerSmoothing);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
