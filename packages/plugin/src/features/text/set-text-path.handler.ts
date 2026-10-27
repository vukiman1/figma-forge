import {
  type MutateResult,
  SET_TEXT_PATH_TOOL_NAME as TOOL,
  setTextPathParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { segmentOutOfRange } from './path-segments.js';

const requireTextPath = async (figmaCtx: typeof figma, nodeId: string): Promise<TextPathNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node?.type === 'TEXT_PATH') return node;
  throw new Error(
    `${TOOL}: node ${nodeId} is not text on a path (TEXT_PATH) — make one with create_text_path`,
  );
};

export const createSetTextPathHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, startSegment, startPosition } = parseParams(TOOL, setTextPathParams, raw);
    if (startSegment === undefined && startPosition === undefined) {
      throw new TypeError(`${TOOL}: give startSegment, startPosition or both`);
    }
    const node = await requireTextPath(figmaCtx, nodeId);
    const count = node.vectorNetwork.segments.length;
    const segment = startSegment ?? node.textPathStartData.segment;
    if (segment >= count) {
      throw segmentOutOfRange(TOOL, nodeId, segment, count, 'keep the start where it is');
    }
    node.textPathStartData = {
      segment,
      position: startPosition ?? node.textPathStartData.position,
    };
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
