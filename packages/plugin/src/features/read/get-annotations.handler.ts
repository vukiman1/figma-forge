import {
  GET_ANNOTATIONS_TOOL_NAME as TOOL,
  getAnnotationsParams,
  type GetAnnotationsResult,
  type NodeAnnotations,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { serializeAnnotation } from '../../serializer.js';
import { walk } from '../../traverse.js';
import { parseParams } from '../parse-params.js';

const annotationsOf = (node: BaseNode): NodeAnnotations[] => {
  if (!('annotations' in node) || !Array.isArray(node.annotations)) return [];
  if (node.annotations.length === 0) return [];
  const annotations: readonly Annotation[] = node.annotations;
  return [
    { nodeId: node.id, nodeName: node.name, annotations: annotations.map(serializeAnnotation) },
  ];
};

const scopeOf = async (
  figmaCtx: typeof figma,
  nodeId: string | undefined,
): Promise<Iterable<BaseNode>> => {
  if (nodeId === undefined) return walk(figmaCtx.currentPage.children);
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  return node === null ? [] : [node];
};

export const createGetAnnotationsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, getAnnotationsParams, raw);
    const scope = await scopeOf(figmaCtx, nodeId);
    const result: GetAnnotationsResult = { annotations: [...scope].flatMap(annotationsOf) };
    return result;
  };
