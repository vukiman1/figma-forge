import type { FlowStartingPoint } from '@figma-forge/core';

export const readFlows = (page: PageNode): FlowStartingPoint[] =>
  page.flowStartingPoints.map(flow => ({ nodeId: flow.nodeId, name: flow.name }));

export const sameFlows = (
  a: readonly FlowStartingPoint[],
  b: readonly FlowStartingPoint[],
): boolean =>
  a.length === b.length &&
  a.every((flow, index) => flow.nodeId === b[index]?.nodeId && flow.name === b[index]?.name);
