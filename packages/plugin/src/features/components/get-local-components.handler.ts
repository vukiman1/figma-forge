import {
  GET_LOCAL_COMPONENTS_TOOL_NAME as TOOL,
  type GetLocalComponentsResult,
  getLocalComponentsParams,
  type SerializedComponentInfo,
  type SerializedComponentSetInfo,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import type { PropertyOwner } from './component-owner.js';

const NOTHING_SELECTED =
  'Nothing selected. Select frames/layers in Figma (or pass an explicit nodeId). ' +
  'get_local_components scans a subtree, not the whole document (times out on large files).';

const WHOLE_DOCUMENT =
  'get_local_components scans a subtree, not the whole document. ' +
  'Use get_pages to find a page, then pass its id as nodeId (or select frames to scan).';

const rootsToScan = async (
  figmaCtx: typeof figma,
  nodeId: string | undefined,
): Promise<readonly BaseNode[]> => {
  if (nodeId === undefined) {
    if (figmaCtx.currentPage.selection.length === 0) throw new Error(NOTHING_SELECTED);
    return figmaCtx.currentPage.selection;
  }
  const node =
    nodeId === figmaCtx.root.id ? figmaCtx.root : await figmaCtx.getNodeByIdAsync(nodeId);
  return node === null ? [] : [node];
};

const componentsUnder = (root: BaseNode): PropertyOwner[] => [
  ...(root.type === 'COMPONENT' || root.type === 'COMPONENT_SET' ? [root] : []),
  ...('findAllWithCriteria' in root
    ? root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })
    : []),
];

const toComponentInfo = (node: ComponentNode): SerializedComponentInfo => ({
  id: node.id,
  name: node.name,
  key: node.key,
  description: node.description,
  parentId: node.parent === null ? null : node.parent.id,
  ...(node.variantProperties === null ? {} : { variantProperties: { ...node.variantProperties } }),
});

const toComponentSetInfo = (node: ComponentSetNode): SerializedComponentSetInfo => ({
  id: node.id,
  name: node.name,
  key: node.key,
  description: node.description,
  componentIds: node.children.map(child => child.id),
  variantGroupProperties: Object.fromEntries(
    Object.entries(node.variantGroupProperties).map(([name, group]) => [
      name,
      { values: [...group.values] },
    ]),
  ),
});

export const createGetLocalComponentsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, getLocalComponentsParams, raw);
    const roots = await rootsToScan(figmaCtx, nodeId);
    if (roots.some(root => root.type === 'DOCUMENT')) throw new Error(WHOLE_DOCUMENT);
    const found = [
      ...new Map(roots.flatMap(componentsUnder).map(node => [node.id, node])).values(),
    ];
    const result: GetLocalComponentsResult = {
      components: found.filter(node => node.type === 'COMPONENT').map(toComponentInfo),
      componentSets: found.filter(node => node.type === 'COMPONENT_SET').map(toComponentSetInfo),
    };
    return result;
  };
