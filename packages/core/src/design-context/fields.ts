import { pickDefined } from '../object/pick-defined.js';
import type { DesignContextNode } from './node.js';

type NodeField = keyof DesignContextNode;

export const LAYOUT_FIELDS = [
  'layout',
  'layoutGrids',
  'layoutSizingHorizontal',
  'layoutSizingVertical',
  'layoutGrow',
  'layoutAlign',
  'layoutPositioning',
  'gridChild',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'targetAspectRatio',
  'constraints',
  'clipsContent',
  'overflowDirection',
  'numberOfFixedChildren',
  'transformModifiers',
  'repeatTransforms',
  'renderBounds',
  'flipped',
  'cssTransform',
  'boundingBox',
] as const satisfies readonly NodeField[];

const CONTENT_FIELDS = [
  'characters',
  'textAutoResize',
  'textAlignHorizontal',
  'textAlignVertical',
  'textTruncation',
  'maxLines',
  'textOverrides',
  'componentProperties',
  'componentPropertyReferences',
  'annotations',
] as const satisfies readonly NodeField[];

export const LAYOUT_TIER_FIELDS = [
  ...LAYOUT_FIELDS,
  ...CONTENT_FIELDS,
] as const satisfies readonly NodeField[];

const PLAN_ROOT_FIELDS = ['x', 'y', 'width', 'height', ...LAYOUT_FIELDS] as const;

export const planRootFrom = (node: DesignContextNode): DesignContextNode => ({
  id: node.id,
  name: node.name,
  type: node.type,
  ...pickDefined(node, PLAN_ROOT_FIELDS),
});
