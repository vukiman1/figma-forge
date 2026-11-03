import {
  type DesignContextNode,
  type DesignContextSection,
  type GetDesignContextResult,
  planRootFrom,
} from '@figma-forge/core';

const MAX_PLAN_SECTIONS = 60;

const countNodes = (nodes: readonly DesignContextNode[]): number =>
  nodes.reduce(
    (total, node) => total + 1 + (node.children === undefined ? 0 : countNodes(node.children)),
    0,
  );

const findSectionNodes = (roots: readonly DesignContextNode[]): readonly DesignContextNode[] => {
  let sections = roots;
  for (let hop = 0; hop < 2 && sections.length === 1; hop += 1) {
    const children = sections[0]?.children;
    if (children === undefined || children.length === 0) break;
    sections = children;
  }
  return sections;
};

const createSection = (node: DesignContextNode): DesignContextSection => ({
  nodeId: node.id,
  name: node.name,
  type: node.type,
  childCount: node.children?.length ?? 0,
  nodes: countNodes([node]),
});

export const sectionPlanFromPayload = (
  result: GetDesignContextResult,
  payloadChars: number,
): GetDesignContextResult | null => {
  const sectionNodes = findSectionNodes(result.nodes);
  if (sectionNodes.length < 2) return null;
  const sections = sectionNodes.slice(0, MAX_PLAN_SECTIONS).map(createSection);
  const omitted = sectionNodes.length - sections.length;
  return {
    note:
      `This tree serialized to ~${Math.round(payloadChars / 1000)}k chars — beyond what a tool ` +
      'result can deliver. Ground it section by section: call get_design_context per section ' +
      'nodeId (detail: full, dedupeComponents: true) and build each before moving on. Do not ' +
      'retry this call unscoped and do not depth-cap the whole page.',
    nodes: result.nodes.map(planRootFrom),
    sectionPlan: {
      reason: 'payload-size',
      payloadChars,
      sections,
      ...(omitted > 0 ? { sectionsOmitted: omitted } : {}),
    },
  };
};
