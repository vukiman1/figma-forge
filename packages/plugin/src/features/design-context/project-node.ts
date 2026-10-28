import {
  type DesignContextNode,
  type DetailLevel,
  pickDefined,
  type SerializedNode,
} from '@figma-forge/core';

import { serializeFlatSync } from '../../serializer.js';
import { dropDefaults } from './drop-defaults.js';
import { projectText } from './project-text.js';
import { cleanStyleIds } from './style-ids.js';

const NODE_FIELDS = [
  'rotation',
  'flipped',
  'cssTransform',
  'boundingBox',
  'opacity',
  'cornerRadius',
  'cornerRadii',
  'cornerSmoothing',
  'blendMode',
  'isMask',
  'maskType',
  'arcData',
  'fills',
  'strokes',
  'strokeWeight',
  'strokeWeights',
  'strokeAlign',
  'dashPattern',
  'strokeCap',
  'strokeJoin',
  'complexStrokeProperties',
  'variableWidthStrokeProperties',
  'renderBounds',
  'effects',
  'layout',
  'layoutSizingHorizontal',
  'layoutSizingVertical',
  'layoutGrow',
  'layoutAlign',
  'layoutPositioning',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'gridChild',
  'constraints',
  'clipsContent',
  'layoutGrids',
  'overflowDirection',
  'numberOfFixedChildren',
  'targetAspectRatio',
  'annotations',
  'transformModifiers',
  'repeatTransforms',
  'boundVariables',
  'componentProperties',
  'componentPropertyReferences',
] as const satisfies readonly (keyof SerializedNode)[];

const NODE_DEFAULTS = {
  rotation: 0,
  flipped: false,
  opacity: 1,
  cornerRadius: 0,
  cornerSmoothing: 0,
} as const;

const projectFull = (node: SceneNode): DesignContextNode => {
  const flat = serializeFlatSync(node);
  return {
    id: flat.id,
    name: flat.name,
    type: flat.type,
    ...(!flat.visible && { visible: false }),
    x: flat.x,
    y: flat.y,
    width: flat.width,
    height: flat.height,
    ...dropDefaults(pickDefined(flat, NODE_FIELDS), NODE_DEFAULTS),
    ...projectText(flat),
    ...(flat.styleIds !== undefined && { styleIds: cleanStyleIds(flat.styleIds) }),
    ...(flat.explicitVariableModes !== undefined && { variableModes: flat.explicitVariableModes }),
  };
};

export const project = (node: SceneNode, detail: DetailLevel): DesignContextNode => {
  if (detail === 'minimal') return { id: node.id, name: node.name, type: node.type };
  if (detail === 'full') return projectFull(node);
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    ...(!node.visible && { visible: false }),
  };
};
