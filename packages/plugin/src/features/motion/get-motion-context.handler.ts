import { GET_MOTION_CONTEXT_TOOL_NAME as TOOL, getMotionContextParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { inventoryMotion } from './context/inventory.js';
import { hasMotionState, type MotionNode } from './motion-node.js';

const HIDDEN_IN_INSTANCES =
  ' This editor also hides invisible layers inside instances from plugins, so such a layer ' +
  'reads as missing here; the Figma Design editor can read it.';

const requireMotionRoot = async (
  figmaCtx: typeof figma,
  nodeId: string,
): Promise<MotionNode & SceneNode> => {
  const root = await figmaCtx.getNodeByIdAsync(nodeId);
  if (root === null) {
    throw new Error(
      `${TOOL}: node "${nodeId}" not found in this file. Check the id (a pasted Figma URL works ` +
        `too).${figmaCtx.skipInvisibleInstanceChildren ? HIDDEN_IN_INSTANCES : ''}`,
    );
  }
  if (hasMotionState(root) && root.type !== 'PAGE' && root.type !== 'DOCUMENT') return root;
  throw new Error(
    `${TOOL}: "${nodeId}" is a ${root.type}, which carries no Figma Motion. Pass a frame or ` +
      'layer id — a top-level frame covers its whole timeline.',
  );
};

export const createGetMotionContextHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, getMotionContextParams, raw);
    const root = await requireMotionRoot(figmaCtx, nodeId);
    const skipping = figmaCtx.skipInvisibleInstanceChildren;
    figmaCtx.skipInvisibleInstanceChildren = false;
    try {
      return inventoryMotion(root);
    } finally {
      figmaCtx.skipInvisibleInstanceChildren = skipping;
    }
  };
