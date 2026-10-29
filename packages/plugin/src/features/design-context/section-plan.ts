import {
  type DesignContextSection,
  type GetDesignContextResult,
  planRootFrom,
} from '@figma-forge/core';

import { childrenOf } from './child-nodes.js';
import { depthBelow, UNLIMITED_DEPTH } from './depth.js';
import { project } from './project-node.js';

const MAX_PLAN_SECTIONS = 60;
const MAX_WRAPPER_HOPS = 2;

export const countNodes = (nodes: readonly SceneNode[], remainingDepth: number): number =>
  nodes.reduce((total, node) => {
    if (remainingDepth === 0) return total + 1;
    return total + 1 + countNodes(childrenOf(node), depthBelow(remainingDepth));
  }, 0);

const sectionNodesOf = (roots: readonly SceneNode[]): readonly SceneNode[] => {
  let sections = roots;
  for (let hops = 0; hops < MAX_WRAPPER_HOPS; hops += 1) {
    const children =
      sections.length === 1 && sections[0] !== undefined ? childrenOf(sections[0]) : [];
    if (children.length === 0) return sections;
    sections = children;
  }
  return sections;
};

const toSection = (node: SceneNode): DesignContextSection => ({
  nodeId: node.id,
  name: node.name,
  type: node.type,
  childCount: childrenOf(node).length,
  nodes: countNodes([node], UNLIMITED_DEPTH),
});

export const sectionPlanResult = (
  roots: readonly SceneNode[],
  totalNodes: number,
): GetDesignContextResult => {
  const candidates = sectionNodesOf(roots);
  const sections = candidates.slice(0, MAX_PLAN_SECTIONS).map(toSection);
  const omitted = candidates.length - sections.length;
  return {
    note:
      `This tree is ${totalNodes} nodes — too large to serialize whole. Ground it section by ` +
      'section: call get_design_context per section nodeId (detail: full, dedupeComponents: true) ' +
      'and build each before moving on. Do not retry this call unscoped and do not depth-cap the ' +
      'whole page.',
    nodes: roots.map(node => planRootFrom(project(node, 'full'))),
    sectionPlan: {
      reason: 'node-count',
      totalNodes,
      sections,
      ...(omitted > 0 && { sectionsOmitted: omitted }),
    },
  };
};
