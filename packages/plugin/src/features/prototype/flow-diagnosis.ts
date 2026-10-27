import { UPDATE_FLOWS_TOOL_NAME as TOOL } from '@figma-forge/core';

const FLOW_START_TYPES: ReadonlySet<NodeType> = new Set(['FRAME', 'COMPONENT', 'INSTANCE']);

const TOP_LEVEL_PARENTS: ReadonlySet<NodeType> = new Set(['PAGE', 'SECTION']);

const pageOf = (node: BaseNode): PageNode | null => {
  for (let at: BaseNode | null = node; at !== null; at = at.parent) {
    if (at.type === 'PAGE') return at;
  }
  return null;
};

const isHidden = (node: BaseNode | null): boolean =>
  node !== null && 'visible' in node && !node.visible;

const reasonFor = (node: BaseNode | null, id: string, page: PageNode): string | null => {
  if (node === null) return `${id} does not exist`;
  if (node.type === 'PAGE' || node.type === 'DOCUMENT') return `${id} is a ${node.type}`;
  const home = pageOf(node);
  if (home !== null && home.id !== page.id)
    return `${id} is on page "${home.name}", not "${page.name}"`;
  const { parent } = node;
  if (parent !== null && !TOP_LEVEL_PARENTS.has(parent.type)) {
    return `${id} (${node.type}) sits inside a ${parent.type}, and a flow starts on a top-level frame`;
  }
  if (!FLOW_START_TYPES.has(node.type)) {
    return `${id} is a ${node.type}, and a flow starts on a frame, component or instance`;
  }
  return isHidden(node) ? `${id} is hidden` : null;
};

export const diagnoseFlowStarts = async (
  figmaCtx: typeof figma,
  page: PageNode,
  ids: readonly string[],
): Promise<string[]> => {
  const reasons = await Promise.all(
    ids.map(async id => reasonFor(await figmaCtx.getNodeByIdAsync(id), id, page)),
  );
  return reasons.filter(reason => reason !== null);
};

export const refuseHiddenStarts = async (
  figmaCtx: typeof figma,
  page: PageNode,
  ids: readonly string[],
): Promise<void> => {
  const nodes = await Promise.all(ids.map(async id => figmaCtx.getNodeByIdAsync(id)));
  const hidden = ids.filter((_id, index) => isHidden(nodes[index] ?? null));
  if (hidden.length === 0) return;
  throw new Error(
    `${TOOL}: ${hidden.join(', ')} ${hidden.length === 1 ? 'is' : 'are'} hidden, so the flows on ` +
      `page "${page.name}" were left unchanged — Figma takes a hidden frame without an error but ` +
      'keeps its flow out of sight, where no plugin can rename or remove it, until the frame is ' +
      'shown. Show the frame first (set_visible)',
  );
};
