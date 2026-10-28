import {
  GET_VECTOR_TOOL_NAME as TOOL,
  type GetVectorResult,
  getVectorParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { serializeVectorNetwork } from './serialize-vector-network.js';

const MIXED = 'mixed';

const isPathOwner = (node: BaseNode): node is VectorNode | TextPathNode =>
  node.type === 'VECTOR' || node.type === 'TEXT_PATH';

const requirePathOwner = async (
  figmaCtx: typeof figma,
  nodeId: string,
): Promise<VectorNode | TextPathNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node !== null && isPathOwner(node)) return node;
  throw new Error(
    `${TOOL}: node ${nodeId} is ${node === null ? 'not found' : `a ${node.type}`} — only a ` +
      'VECTOR or text on a path has a path to read (flatten_nodes turns a shape into a VECTOR)',
  );
};

export const createGetVectorHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, getVectorParams, raw);
    const vector = await requirePathOwner(figmaCtx, nodeId);
    const { width, height, handleMirroring } = vector;
    const result: GetVectorResult = {
      nodeId: vector.id,
      type: vector.type,
      width,
      height,
      vectorPaths: vector.vectorPaths.map(({ windingRule, data }) => ({ windingRule, data })),
      vectorNetwork: serializeVectorNetwork(vector.vectorNetwork, { width, height }),
      handleMirroring: typeof handleMirroring === 'string' ? handleMirroring : MIXED,
    };
    return result;
  };
