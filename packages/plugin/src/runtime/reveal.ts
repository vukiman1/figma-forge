import { isSceneNode } from '../features/nodes/scene-node.js';

export interface RevealOutcome {
  readonly revealed: number;
  readonly switchedPage: boolean;
}

const MAX_REVEAL_ZOOM = 4;
const NOTHING_REVEALED: RevealOutcome = { revealed: 0, switchedPage: false };

const pageOf = (node: BaseNode): PageNode | null => {
  for (let cursor: BaseNode | null = node; cursor !== null; cursor = cursor.parent) {
    if (cursor.type === 'PAGE') return cursor;
  }
  return null;
};

const liveSceneNodes = async (
  figmaCtx: typeof figma,
  nodeIds: readonly string[],
): Promise<SceneNode[]> => {
  const resolved = await Promise.all(
    nodeIds.map(async id => figmaCtx.getNodeByIdAsync(id).catch(() => null)),
  );
  return resolved.filter((node): node is SceneNode => isSceneNode(node) && !node.removed);
};

export const revealNodes = async (
  figmaCtx: typeof figma,
  nodeIds: readonly string[],
): Promise<RevealOutcome> => {
  const found = await liveSceneNodes(figmaCtx, nodeIds);
  const target = found[0] === undefined ? null : pageOf(found[0]);
  if (target === null) return NOTHING_REVEALED;
  const onTarget = found.filter(node => pageOf(node) === target);
  const switchedPage = target.id !== figmaCtx.currentPage.id;
  if (switchedPage) await figmaCtx.setCurrentPageAsync(target);
  figmaCtx.currentPage.selection = onTarget;
  figmaCtx.viewport.scrollAndZoomIntoView(onTarget);
  if (figmaCtx.viewport.zoom > MAX_REVEAL_ZOOM) figmaCtx.viewport.zoom = MAX_REVEAL_ZOOM;
  return { revealed: onTarget.length, switchedPage };
};
