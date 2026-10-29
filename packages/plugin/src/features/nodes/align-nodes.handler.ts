import {
  ALIGN_NODES_TOOL_NAME as TOOL,
  alignNodesParams,
  type BatchNodeResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';
import { alignmentOffset, distributionOffsets } from './align-offsets.js';
import { toAlignTarget } from './align-target.js';
import { unionOf } from './node-box.js';
import { applyMovesOrRestore, planMove } from './node-moves.js';

export const createAlignNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, horizontal, vertical, relativeTo, distribute } = parseParams(
      TOOL,
      alignNodesParams,
      raw,
    );
    const ids = [...new Set(nodeIds)];
    const idSet = new Set(ids);
    const isSelection = relativeTo === 'SELECTION';
    const isMeasuredOnCanvas = isSelection || (horizontal === undefined && vertical === undefined);
    const nodes = await Promise.all(ids.map(async id => requireNode(figmaCtx, TOOL, id)));
    const targets = nodes.map(node => toAlignTarget(node, idSet, isMeasuredOnCanvas));
    const selection = isSelection ? unionOf(targets.map(target => target.box)) : null;
    const spread =
      distribute === undefined
        ? []
        : distributionOffsets(
            targets.map(target => target.canvasBox),
            distribute,
          );
    const moves = targets.flatMap((target, index) => {
      const [ax, ay] = alignmentOffset(target, selection ?? target.parentBounds, {
        horizontal,
        vertical,
      });
      const [sx, sy] = spread[index] ?? [0, 0];
      return planMove(target.node, [ax + sx, ay + sy]) ?? [];
    });
    applyMovesOrRestore(TOOL, moves);
    const result: BatchNodeResult = { ok: true, affected: ids };
    return result;
  };
