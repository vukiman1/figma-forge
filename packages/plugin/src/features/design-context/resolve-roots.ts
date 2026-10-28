import { GET_DESIGN_CONTEXT_TOOL_NAME as TOOL } from '@figma-forge/core';

import { isSceneNode } from '../nodes/scene-node.js';

const nodeRoot = async (figmaCtx: typeof figma, nodeId: string): Promise<SceneNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null) {
    throw new Error(
      `${TOOL}: node "${nodeId}" not found in this file. Check the id (a pasted ` +
        'Figma URL works too), or select the target in Figma and call without nodeId.',
    );
  }
  if (isSceneNode(node)) return node;
  throw new Error(
    `${TOOL}: "${nodeId}" is a ${node.type}, not a frame/layer. Pass a frame or ` +
      'layer id, or select nodes on that page and call without nodeId — grounding a whole ' +
      'page is too large and ambiguous.',
  );
};

export const resolveRoots = async (
  figmaCtx: typeof figma,
  nodeId: string | undefined,
): Promise<readonly SceneNode[]> => {
  if (nodeId !== undefined) return [await nodeRoot(figmaCtx, nodeId)];
  const selection = figmaCtx.currentPage.selection;
  if (selection.length > 0) return selection;
  throw new Error(
    'Nothing selected. Select one or more frames/layers in Figma (or pass an explicit nodeId). ' +
      'get_design_context no longer scans the whole page — it is too large and ambiguous.',
  );
};
