import { type MutateResult, SET_ARC_TOOL_NAME as TOOL, setArcParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';

const requireEllipse = async (figmaCtx: typeof figma, nodeId: string): Promise<EllipseNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node?.type === 'ELLIPSE') return node;
  throw new Error(`${TOOL}: node ${nodeId} not found or is not an ellipse`);
};

export const createSetArcHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, ...arc } = parseParams(TOOL, setArcParams, raw);
    const ellipse = await requireEllipse(figmaCtx, nodeId);
    const current = ellipse.arcData;
    ellipse.arcData = {
      startingAngle: arc.startingAngle ?? current.startingAngle,
      endingAngle: arc.endingAngle ?? current.endingAngle,
      innerRadius: arc.innerRadius ?? current.innerRadius,
    };
    const result: MutateResult = { ok: true, nodeId: ellipse.id };
    return result;
  };
