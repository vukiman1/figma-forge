import { UPDATE_FLOWS_TOOL_NAME as TOOL, type FlowStartingPoint } from '@figma-forge/core';

export interface FlowChanges {
  pageName: string;
  flows: readonly FlowStartingPoint[];
  remove: readonly string[];
  order: readonly string[];
}

const HIDDEN_FLOWS =
  'a flow whose starting frame is hidden, inside a group or nested in another frame is kept out of ' +
  'sight by Figma — plugins cannot list, rename or remove it until the frame is visible and ' +
  'top-level again';

export const refuseRepeats = (ids: readonly string[], field: string): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${TOOL}: ${field} names ${id} more than once`);
    seen.add(id);
  }
};

const assertRemovable = (current: ReadonlySet<string>, changes: FlowChanges): void => {
  const removing = new Set(changes.remove);
  const conflict = changes.flows.find(flow => removing.has(flow.nodeId));
  if (conflict !== undefined)
    throw new Error(`${TOOL}: ${conflict.nodeId} is in both flows and remove`);
  const missing = changes.remove.find(id => !current.has(id));
  if (missing === undefined) return;
  throw new Error(
    `${TOOL}: ${missing} is not a flow starting point on page "${changes.pageName}", so there is ` +
      `nothing to remove (${HIDDEN_FLOWS})`,
  );
};

const reorder = (
  next: readonly FlowStartingPoint[],
  order: readonly string[],
): FlowStartingPoint[] => {
  const byId = new Map(next.map(flow => [flow.nodeId, flow]));
  const front = order.map(id => {
    const flow = byId.get(id);
    if (flow !== undefined) return flow;
    throw new Error(
      `${TOOL}: order names ${id}, which is not a flow starting point after this call — add it ` +
        'through flows first',
    );
  });
  const moved = new Set(order);
  return [...front, ...next.filter(flow => !moved.has(flow.nodeId))];
};

export const planFlows = (
  current: readonly FlowStartingPoint[],
  changes: FlowChanges,
): FlowStartingPoint[] => {
  const currentIds = new Set(current.map(flow => flow.nodeId));
  assertRemovable(currentIds, changes);
  const removing = new Set(changes.remove);
  const renamed = new Map(changes.flows.map(flow => [flow.nodeId, flow.name]));
  const kept = current
    .filter(flow => !removing.has(flow.nodeId))
    .map(flow => ({ nodeId: flow.nodeId, name: renamed.get(flow.nodeId) ?? flow.name }));
  const added = changes.flows.filter(flow => !currentIds.has(flow.nodeId));
  return reorder([...kept, ...added], changes.order);
};
