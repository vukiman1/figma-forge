import {
  RESIZE_NODES_TOOL_NAME as TOOL,
  type ResizeNodesResult,
  resizeNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { InvalidParamsError, parseParams } from '../parse-params.js';
import { type Adjusted, type Box, explainMiss, sameBox } from './resize-outcome.js';

type Resizable = BaseNode & Box & { resize: (width: number, height: number) => void };

interface Target {
  readonly id: string;
  readonly node: Resizable;
}

const FIGMA_MIN_SIZE = 0.01;

const isResizable = (node: BaseNode | null): node is Resizable =>
  node !== null && 'resize' in node && typeof node.resize === 'function';

const resizableTargets = async (
  figmaCtx: typeof figma,
  ids: readonly string[],
): Promise<Target[]> => {
  const nodes = await Promise.all(ids.map(async id => figmaCtx.getNodeByIdAsync(id)));
  return ids.flatMap((id, index) => {
    const node = nodes[index] ?? null;
    return isResizable(node) ? [{ id, node }] : [];
  });
};

const requireBoxHeight = (targets: readonly Target[], height: number): void => {
  const flat = targets.find(({ node }) => node.type !== 'LINE' && height < FIGMA_MIN_SIZE);
  if (flat === undefined) return;
  throw new InvalidParamsError(
    `${TOOL}: node ${flat.id} (${flat.node.type}) needs a height of at least 0.01 — only a LINE takes height 0`,
  );
};

const boxOf = (node: Resizable): Box => ({ width: node.width, height: node.height });

const outcome = (
  targets: readonly Target[],
  requested: Box,
  before: readonly Box[],
): ResizeNodesResult => {
  const affected: string[] = [];
  const adjusted: Adjusted[] = [];
  targets.forEach(({ id, node }, index) => {
    const after = boxOf(node);
    const was = before[index] ?? after;
    if (sameBox(after, requested)) affected.push(id);
    else adjusted.push({ nodeId: id, ...after, reason: explainMiss(node, requested, was, after) });
  });
  const changedAny = targets.some(
    ({ node }, index) => !sameBox(boxOf(node), before[index] ?? boxOf(node)),
  );
  if (affected.length === 0 && adjusted.length > 0 && !changedAny) {
    const stayed = adjusted.map(
      miss => `${miss.nodeId} stayed ${miss.width} × ${miss.height}: ${miss.reason}`,
    );
    throw new Error(`${TOOL}: nothing was resized — ${stayed.join('; ')}`);
  }
  return { ok: true, affected, ...(adjusted.length > 0 && { adjusted }) };
};

export const createResizeNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, ...requested } = parseParams(TOOL, resizeNodesParams, raw);
    const targets = await resizableTargets(figmaCtx, nodeIds);
    requireBoxHeight(targets, requested.height);
    const before = targets.map(({ node }) => boxOf(node));
    for (const { node } of targets) {
      node.resize(requested.width, node.type === 'LINE' ? 0 : requested.height);
    }
    return outcome(targets, requested, before);
  };
