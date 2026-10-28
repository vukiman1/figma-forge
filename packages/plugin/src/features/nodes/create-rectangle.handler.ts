import { CREATE_RECTANGLE_TOOL_NAME as TOOL, createRectangleParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { applyInitialProps } from './initial-props.js';
import { createdResult, isSized, setNameAndPosition } from './new-node.js';
import { placeNode } from './place-node.js';

export const createCreateRectangleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, createRectangleParams, raw);
    const node = figmaCtx.createRectangle();
    if (isSized(params)) node.resize(params.width, params.height);
    setNameAndPosition(node, params);
    await placeNode(figmaCtx, node, params.parentId, TOOL);
    await applyInitialProps(figmaCtx, node, params, TOOL);
    return createdResult(node);
  };
