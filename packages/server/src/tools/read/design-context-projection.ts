import {
  type DesignContextNode,
  type GetDesignContextResult,
  LAYOUT_FIELDS,
  LAYOUT_TIER_FIELDS,
} from '@figma-forge/core';

const LAYOUT_AND_CONTENT_FIELDS = new Set<string>(LAYOUT_TIER_FIELDS);
const LAYOUT_ONLY_FIELDS = new Set<string>(LAYOUT_FIELDS);

const selectExtraFields = (
  node: DesignContextNode,
  extraFields: ReadonlySet<string> | undefined,
): Record<string, unknown> =>
  extraFields === undefined
    ? {}
    : Object.fromEntries(
        Object.entries(node).filter(([key, value]) => extraFields.has(key) && value !== undefined),
      );

export const projectDesignContextNode = (
  node: DesignContextNode,
  extraFields?: ReadonlySet<string>,
): DesignContextNode => ({
  id: node.id,
  name: node.name,
  type: node.type,
  ...(node.visible === false ? { visible: false } : {}),
  ...(node.x === undefined ? {} : { x: node.x }),
  ...(node.y === undefined ? {} : { y: node.y }),
  ...(node.width === undefined ? {} : { width: node.width }),
  ...(node.height === undefined ? {} : { height: node.height }),
  ...(node.mainComponentId === undefined ? {} : { mainComponentId: node.mainComponentId }),
  ...(node.truncated === true ? { truncated: true } : {}),
  ...(node.deduped === true ? { deduped: true } : {}),
  ...selectExtraFields(node, extraFields),
  ...(node.children === undefined
    ? {}
    : { children: node.children.map(child => projectDesignContextNode(child, extraFields)) }),
});

export const projectDesignContext = (
  result: GetDesignContextResult,
  tier: 'layout-content' | 'layout' | 'compact',
): GetDesignContextResult => {
  const extraFields =
    tier === 'layout-content'
      ? LAYOUT_AND_CONTENT_FIELDS
      : tier === 'layout'
        ? LAYOUT_ONLY_FIELDS
        : undefined;
  return {
    nodes: result.nodes.map(node => projectDesignContextNode(node, extraFields)),
    ...(result.hint === undefined ? {} : { hint: result.hint }),
  };
};
