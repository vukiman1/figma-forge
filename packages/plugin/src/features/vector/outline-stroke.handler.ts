import { OUTLINE_STROKE_TOOL_NAME as TOOL, outlineStrokeParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { createdResult } from '../nodes/new-node.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';
import { placeOutline } from './place-outline.js';

type Stroked = SceneNode & MinimalStrokesMixin & { outlineStroke: () => VectorNode | null };

const isStroked = (node: BaseNode): node is Stroked =>
  'outlineStroke' in node && 'strokes' in node && 'strokeWeight' in node;

const requireStroked = async (figmaCtx: typeof figma, nodeId: string): Promise<Stroked> => {
  const node = await requireNode(figmaCtx, TOOL, nodeId);
  if (isStroked(node)) return node;
  throw new Error(`${TOOL}: node ${nodeId} is a ${node.type}, which has no stroke to outline`);
};

const hasVisibleStroke = (node: Stroked): boolean =>
  node.strokes.some(paint => paint.visible !== false) && node.strokeWeight !== 0;

const outlineOf = (node: Stroked): VectorNode => {
  const outline = hasVisibleStroke(node) ? node.outlineStroke() : null;
  if (outline !== null) return outline;
  throw new Error(
    `${TOOL}: node ${node.id} has no stroke to outline — give it one with set_strokes`,
  );
};

export const createOutlineStrokeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, name } = parseParams(TOOL, outlineStrokeParams, raw);
    const node = await requireStroked(figmaCtx, nodeId);
    const outline = outlineOf(node);
    try {
      placeOutline(node, outline);
    } catch (error) {
      outline.remove();
      throw error;
    }
    if (name !== undefined) outline.name = name;
    return createdResult(outline);
  };
