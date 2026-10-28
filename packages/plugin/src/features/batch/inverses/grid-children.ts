import { isSceneNode } from '../../nodes/scene-node.js';
import { liveNode } from '../live-node.js';
import { type GeometrySnapshot, restoreGeometry } from '../snapshot/geometry.js';

export interface ChildPlacement {
  readonly node: SceneNode;
  readonly geometry: GeometrySnapshot;
}

interface PlacementPass {
  readonly failed: readonly ChildPlacement[];
  readonly lastError: unknown;
}

export const livePlacements = async (
  figmaCtx: typeof figma,
  snapshots: readonly GeometrySnapshot[],
): Promise<ChildPlacement[]> => {
  const nodes = await Promise.all(snapshots.map(async ({ id }) => liveNode(figmaCtx, id)));
  return snapshots.flatMap((geometry, index) => {
    const node = nodes[index] ?? null;
    return isSceneNode(node) ? [{ node, geometry }] : [];
  });
};

const placeOnce = (pending: readonly ChildPlacement[]): PlacementPass => {
  const failed: ChildPlacement[] = [];
  let lastError: unknown;
  for (const placement of pending) {
    try {
      restoreGeometry(placement.node, placement.geometry);
    } catch (error) {
      failed.push(placement);
      lastError = error;
    }
  }
  return { failed, lastError };
};

export const restoreChildren = (placements: readonly ChildPlacement[]): void => {
  let pending = placements;
  while (pending.length > 0) {
    const { failed, lastError } = placeOnce(pending);
    if (failed.length === pending.length) throw lastError;
    pending = failed;
  }
};
