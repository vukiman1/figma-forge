import { errorMessage } from '../error-message.js';
import { composeMaps, invertMap, linearPartOf, mapVector, type Vector } from './linear-map.js';
import type { PlacedNode } from './node-box.js';

export interface Move {
  readonly node: SceneNode & PlacedNode;
  readonly x: number;
  readonly y: number;
}

const toCoordinateParent = (node: PlacedNode, canvasDelta: Vector): Vector => {
  const relative = invertMap(linearPartOf(node.relativeTransform));
  if (relative === null) return canvasDelta;
  const parentSpace = invertMap(composeMaps(linearPartOf(node.absoluteTransform), relative));
  return parentSpace === null ? canvasDelta : mapVector(parentSpace, canvasDelta);
};

export const planMove = (node: SceneNode & PlacedNode, canvasDelta: Vector): Move | null => {
  if (canvasDelta[0] === 0 && canvasDelta[1] === 0) return null;
  const [dx, dy] = toCoordinateParent(node, canvasDelta);
  return { node, x: node.x + dx, y: node.y + dy };
};

const putBack = (previous: Move): boolean => {
  try {
    if (previous.node.x !== previous.x) previous.node.x = previous.x;
    if (previous.node.y !== previous.y) previous.node.y = previous.y;
    return true;
  } catch {
    return false;
  }
};

const restoreAll = (tool: string, touched: readonly Move[], error: unknown): Error => {
  const stranded = touched.toReversed().filter(previous => !putBack(previous));
  const cause = error instanceof Error ? error : new Error(errorMessage(error));
  if (stranded.length === 0) return cause;
  const ids = stranded.map(previous => previous.node.id).join(', ');
  return new Error(`${tool}: ${cause.message} — and ${ids} could not be put back`, { cause });
};

export const applyMovesOrRestore = (tool: string, moves: readonly Move[]): void => {
  const touched: Move[] = [];
  try {
    for (const move of moves) {
      touched.push({ node: move.node, x: move.node.x, y: move.node.y });
      move.node.x = move.x;
      move.node.y = move.y;
    }
  } catch (error) {
    throw restoreAll(tool, touched, error);
  }
};
