import type {
  GetMotionContextResult,
  MotionContextNode,
  MotionCoverage,
  NodeMotion,
} from '@figma-forge/core';

import { errorMessage } from '../../error-message.js';
import { hasMotionState, type MotionNode } from '../motion-node.js';
import { hasKeyframe, readNodeMotion } from '../node-motion.js';
import { costOf, MAX_VISITED_NODES, NODE_TOKEN_BUDGET } from './budget.js';
import { createDiagnosticLog, type DiagnosticLog } from './diagnostics.js';
import { pendingCoverage } from './pending.js';
import { withoutPlayedManualTracks } from './tracks.js';

type Reason = NonNullable<MotionCoverage['reasons']>[number];

interface Walk {
  readonly root: SceneNode;
  readonly stack: SceneNode[];
  readonly nodes: MotionContextNode[];
  readonly reasons: Set<Reason>;
  readonly log: DiagnosticLog;
  visited: number;
  spent: number;
}

const childrenOf = (node: SceneNode): readonly SceneNode[] =>
  'children' in node ? node.children : [];

const motionOf = (walk: Walk, node: SceneNode): NodeMotion | null => {
  try {
    return hasMotionState(node) ? readNodeMotion(node) : null;
  } catch (error) {
    if (node === walk.root) throw error;
    walk.reasons.add('read-error');
    walk.log.add({ nodeId: node.id, code: 'read-error', message: errorMessage(error) });
    return null;
  }
};

const isAnimated = (motion: NodeMotion | null): motion is NodeMotion =>
  motion !== null && (motion.animationStyles.length > 0 || hasKeyframe(motion));

const entryOf = (node: SceneNode, motion: NodeMotion): MotionContextNode => ({
  nodeId: node.id,
  parentId: node.parent?.id ?? null,
  name: node.name,
  type: node.type,
  motion: withoutPlayedManualTracks(motion),
});

const record = (walk: Walk, node: SceneNode, entry: MotionContextNode): 'full' | 'kept' => {
  const cost = costOf(entry);
  if (walk.spent + cost <= NODE_TOKEN_BUDGET) {
    walk.spent += cost;
    walk.nodes.push(entry);
    return 'kept';
  }
  walk.reasons.add('payload-limit');
  if (walk.nodes.length > 0) return 'full';
  walk.log.add({
    nodeId: node.id,
    code: 'node-over-budget',
    message:
      `This node's Motion alone is ~${cost} estimated tokens, over one call's budget. ` +
      "get_node_motion returns it unbounded, which may exceed your client's output cap.",
  });
  return 'kept';
};

const step = (walk: Walk, node: SceneNode): 'stop' | 'next' => {
  walk.visited += 1;
  const motion = motionOf(walk, node);
  if (isAnimated(motion) && record(walk, node, entryOf(node, motion)) === 'full') {
    walk.stack.push(node);
    return 'stop';
  }
  for (const child of childrenOf(node).toReversed()) walk.stack.push(child);
  return 'next';
};

const walkTree = (walk: Walk): void => {
  for (let node = walk.stack.pop(); node !== undefined; node = walk.stack.pop()) {
    if (walk.visited === MAX_VISITED_NODES) {
      walk.reasons.add('node-limit');
      walk.stack.push(node);
      return;
    }
    if (step(walk, node) === 'stop') return;
  }
};

const coverageOf = (walk: Walk): MotionCoverage => ({
  status: walk.reasons.size > 0 ? 'partial' : 'complete',
  visitedNodes: walk.visited,
  animatedNodes: walk.nodes.length,
  ...(walk.reasons.size > 0 ? { reasons: [...walk.reasons] } : {}),
  ...pendingCoverage(
    walk.stack.toReversed().map(node => node.id),
    walk.spent,
  ),
});

export const inventoryMotion = (root: MotionNode & SceneNode): GetMotionContextResult => {
  const walk: Walk = {
    root,
    stack: [root],
    nodes: [],
    reasons: new Set(),
    log: createDiagnosticLog(),
    visited: 0,
    spent: 0,
  };
  walkTree(walk);
  return {
    rootNodeId: root.id,
    coverage: coverageOf(walk),
    ...(walk.log.entries.length > 0 ? { diagnostics: walk.log.entries } : {}),
    ...(walk.log.omitted > 0 ? { diagnosticsOmitted: walk.log.omitted } : {}),
    nodes: walk.nodes,
  };
};
