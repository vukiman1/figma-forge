import {
  GET_NODE_MOTION_TOOL_NAME as TOOL,
  type GetNodeMotionResult,
  getNodeMotionParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { hasMotionState, readPlayheadPosition } from './motion-node.js';
import { readNodeMotion } from './node-motion.js';

export const createGetNodeMotionHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, getNodeMotionParams, raw);
    const playheadPosition = readPlayheadPosition(figmaCtx);
    const node = await figmaCtx.getNodeByIdAsync(nodeId);
    const found = node !== null && hasMotionState(node);
    const result: GetNodeMotionResult = {
      nodeId: found ? node.id : nodeId,
      motion: found ? readNodeMotion(node) : null,
      ...(playheadPosition === undefined ? {} : { playheadPosition }),
    };
    return result;
  };
