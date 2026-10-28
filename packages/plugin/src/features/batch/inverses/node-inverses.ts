import {
  ALIGN_NODES_TOOL_NAME,
  FLIP_NODES_TOOL_NAME,
  LOCK_NODES_TOOL_NAME,
  MOVE_NODES_TOOL_NAME,
  RENAME_NODE_TOOL_NAME,
  ROTATE_NODES_TOOL_NAME,
  SET_ARC_TOOL_NAME,
  SET_BLEND_MODE_TOOL_NAME,
  SET_CONSTRAINTS_TOOL_NAME,
  SET_CORNER_RADIUS_TOOL_NAME,
  SET_EFFECTS_TOOL_NAME,
  SET_FILLS_TOOL_NAME,
  SET_IMAGE_FILL_TOOL_NAME,
  SET_LAYOUT_GRIDS_TOOL_NAME,
  SET_MASK_TOOL_NAME,
  SET_OPACITY_TOOL_NAME,
  SET_POSITION_TOOL_NAME,
  SET_REPEAT_TOOL_NAME,
  SET_TEXT_PATH_TOOL_NAME,
  SET_TEXT_PROPERTIES_TOOL_NAME,
  SET_TEXT_RANGE_TOOL_NAME,
  SET_TEXT_TOOL_NAME,
  SET_VISIBLE_TOOL_NAME,
  UNLOCK_NODES_TOOL_NAME,
  alignNodesParams,
  flipNodesParams,
  lockNodesParams,
  moveNodesParams,
  renameNodeParams,
  rotateNodesParams,
  setArcParams,
  setBlendModeParams,
  setConstraintsParams,
  setCornerRadiusParams,
  setEffectsParams,
  setFillsParams,
  setImageFillParams,
  setLayoutGridsParams,
  setMaskParams,
  setOpacityParams,
  setPositionParams,
  setRepeatParams,
  setTextParams,
  setTextPathParams,
  setTextPropertiesParams,
  setTextRangeParams,
  setVisibleParams,
  unlockNodesParams,
} from '@figma-forge/core';

import type { BatchInverse } from '../inverse.js';
import { setAutoLayoutInverse } from './auto-layout.js';
import { combineAsVariantsInverse } from './combine-as-variants.js';
import { setComplexStrokeInverse } from './complex-stroke.js';
import { groupNodesInverse, repeatNodesInverse } from './group-and-repeat-nodes.js';
import { setLayoutPropsInverse } from './layout-props.js';
import { nodeFieldsInverse } from './node-snapshots.js';
import { CORNERS, propsInverse } from './props.js';
import { reorderNodesInverse } from './reorder-nodes.js';
import { reparentNodesInverse } from './reparent-nodes.js';
import { batchRenameInverse, resizeNodesInverse } from './resize-and-rename.js';
import { setStrokesInverse } from './strokes.js';
import { findReplaceInverse, textInverse } from './text.js';
import { outlineStrokeInverse, setVectorInverse } from './vector.js';

const RESIZES = { resizes: true } as const;

export const NODE_INVERSES: Readonly<Record<string, BatchInverse>> = {
  [SET_FILLS_TOOL_NAME]: propsInverse(SET_FILLS_TOOL_NAME, setFillsParams, ['fills']),
  [SET_IMAGE_FILL_TOOL_NAME]: propsInverse(SET_IMAGE_FILL_TOOL_NAME, setImageFillParams, ['fills']),
  [SET_OPACITY_TOOL_NAME]: propsInverse(SET_OPACITY_TOOL_NAME, setOpacityParams, ['opacity']),
  [SET_VISIBLE_TOOL_NAME]: propsInverse(
    SET_VISIBLE_TOOL_NAME,
    setVisibleParams,
    ['visible'],
    RESIZES,
  ),
  [SET_CORNER_RADIUS_TOOL_NAME]: propsInverse(
    SET_CORNER_RADIUS_TOOL_NAME,
    setCornerRadiusParams,
    CORNERS,
  ),
  [SET_ARC_TOOL_NAME]: propsInverse(SET_ARC_TOOL_NAME, setArcParams, ['arcData']),
  [SET_BLEND_MODE_TOOL_NAME]: propsInverse(SET_BLEND_MODE_TOOL_NAME, setBlendModeParams, [
    'blendMode',
  ]),
  [SET_EFFECTS_TOOL_NAME]: propsInverse(SET_EFFECTS_TOOL_NAME, setEffectsParams, ['effects']),
  [SET_CONSTRAINTS_TOOL_NAME]: propsInverse(SET_CONSTRAINTS_TOOL_NAME, setConstraintsParams, [
    'constraints',
  ]),
  [SET_POSITION_TOOL_NAME]: propsInverse(SET_POSITION_TOOL_NAME, setPositionParams, ['x', 'y']),
  [SET_MASK_TOOL_NAME]: propsInverse(SET_MASK_TOOL_NAME, setMaskParams, ['isMask', 'maskType']),
  [SET_LAYOUT_GRIDS_TOOL_NAME]: propsInverse(SET_LAYOUT_GRIDS_TOOL_NAME, setLayoutGridsParams, [
    'layoutGrids',
  ]),
  [RENAME_NODE_TOOL_NAME]: propsInverse(RENAME_NODE_TOOL_NAME, renameNodeParams, ['name']),
  [SET_REPEAT_TOOL_NAME]: propsInverse(
    SET_REPEAT_TOOL_NAME,
    setRepeatParams,
    ['transformModifiers'],
    RESIZES,
  ),
  [SET_TEXT_PATH_TOOL_NAME]: propsInverse(SET_TEXT_PATH_TOOL_NAME, setTextPathParams, [
    'textPathStartData',
  ]),
  [SET_TEXT_TOOL_NAME]: textInverse(SET_TEXT_TOOL_NAME, setTextParams),
  [SET_TEXT_PROPERTIES_TOOL_NAME]: textInverse(
    SET_TEXT_PROPERTIES_TOOL_NAME,
    setTextPropertiesParams,
  ),
  [SET_TEXT_RANGE_TOOL_NAME]: textInverse(SET_TEXT_RANGE_TOOL_NAME, setTextRangeParams),
  [MOVE_NODES_TOOL_NAME]: nodeFieldsInverse(MOVE_NODES_TOOL_NAME, moveNodesParams, ['x', 'y']),
  [ALIGN_NODES_TOOL_NAME]: nodeFieldsInverse(ALIGN_NODES_TOOL_NAME, alignNodesParams, ['x', 'y']),
  [ROTATE_NODES_TOOL_NAME]: nodeFieldsInverse(
    ROTATE_NODES_TOOL_NAME,
    rotateNodesParams,
    ['rotation'],
    RESIZES,
  ),
  [FLIP_NODES_TOOL_NAME]: nodeFieldsInverse(
    FLIP_NODES_TOOL_NAME,
    flipNodesParams,
    ['relativeTransform'],
    RESIZES,
  ),
  [LOCK_NODES_TOOL_NAME]: nodeFieldsInverse(LOCK_NODES_TOOL_NAME, lockNodesParams, ['locked']),
  [UNLOCK_NODES_TOOL_NAME]: nodeFieldsInverse(UNLOCK_NODES_TOOL_NAME, unlockNodesParams, [
    'locked',
  ]),
  set_strokes: setStrokesInverse,
  find_replace_text: findReplaceInverse,
  set_auto_layout: setAutoLayoutInverse,
  set_layout_props: setLayoutPropsInverse,
  resize_nodes: resizeNodesInverse,
  batch_rename_nodes: batchRenameInverse,
  reorder_nodes: reorderNodesInverse,
  reparent_nodes: reparentNodesInverse,
  group_nodes: groupNodesInverse,
  repeat_nodes: repeatNodesInverse,
  set_complex_stroke: setComplexStrokeInverse,
  set_vector: setVectorInverse,
  outline_stroke: outlineStrokeInverse,
  combine_as_variants: combineAsVariantsInverse,
};
