import { CREATE_VECTOR_TOOL_NAME as TOOL, createVectorParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { applyInitialProps } from '../nodes/initial-props.js';
import { createdResult } from '../nodes/new-node.js';
import { placeNode } from '../nodes/place-node.js';
import { parseParams } from '../parse-params.js';
import { drawGeometry, toVectorGeometry } from './vector-geometry.js';

export const createCreateVectorHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, createVectorParams, raw);
    const geometry = await toVectorGeometry(figmaCtx, params, TOOL);
    const vector = figmaCtx.createVector();
    try {
      if (params.name !== undefined) vector.name = params.name;
      vector.x = params.x ?? 0;
      vector.y = params.y ?? 0;
      await drawGeometry(vector, geometry);
      await placeNode(figmaCtx, vector, params.parentId, TOOL);
      await applyInitialProps(figmaCtx, vector, params, TOOL);
    } catch (error) {
      vector.remove();
      throw error;
    }
    return createdResult(vector);
  };
