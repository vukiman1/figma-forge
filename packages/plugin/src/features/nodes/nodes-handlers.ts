import type { HandlerFactories } from '../handler-factories.js';
import { createAlignNodesHandler } from './align-nodes.handler.js';
import { createBatchRenameNodesHandler } from './batch-rename-nodes.handler.js';
import { createBooleanNodesHandler } from './boolean-nodes.handler.js';
import { createCloneNodeHandler } from './clone-node.handler.js';
import { createCreateEllipseHandler } from './create-ellipse.handler.js';
import { createCreateFrameHandler } from './create-frame.handler.js';
import { createCreateRectangleHandler } from './create-rectangle.handler.js';
import { createCreateSectionHandler } from './create-section.handler.js';
import { createCreateShapeHandler } from './create-shape.handler.js';
import { createDeleteNodesHandler } from './delete-nodes.handler.js';
import { createFlattenNodesHandler } from './flatten-nodes.handler.js';
import { createFlipNodesHandler } from './flip-nodes.handler.js';
import { createGroupNodesHandler } from './group-nodes.handler.js';
import { createImportImageHandler } from './import-image.handler.js';
import { createImportSvgHandler } from './import-svg.handler.js';
import { createLockNodesHandler } from './lock-nodes.handler.js';
import { createMoveNodesHandler } from './move-nodes.handler.js';
import { createRenameNodeHandler } from './rename-node.handler.js';
import { createReorderNodesHandler } from './reorder-nodes.handler.js';
import { createReparentNodesHandler } from './reparent-nodes.handler.js';
import { createRepeatNodesHandler } from './repeat-nodes.handler.js';
import { createResizeNodesHandler } from './resize-nodes.handler.js';
import { createRotateNodesHandler } from './rotate-nodes.handler.js';
import { createSetArcHandler } from './set-arc.handler.js';
import { createSetMaskHandler } from './set-mask.handler.js';
import { createSetPositionHandler } from './set-position.handler.js';
import { createSetRepeatHandler } from './set-repeat.handler.js';
import { createSetVisibleHandler } from './set-visible.handler.js';
import { createUngroupNodesHandler } from './ungroup-nodes.handler.js';
import { createUnlockNodesHandler } from './unlock-nodes.handler.js';

export const NODES_WRITES: HandlerFactories = {
  create_frame: createCreateFrameHandler,
  set_visible: createSetVisibleHandler,
  rename_node: createRenameNodeHandler,
  delete_nodes: createDeleteNodesHandler,
  create_rectangle: createCreateRectangleHandler,
  move_nodes: createMoveNodesHandler,
  align_nodes: createAlignNodesHandler,
  create_shape: createCreateShapeHandler,
  boolean_nodes: createBooleanNodesHandler,
  flatten_nodes: createFlattenNodesHandler,
  resize_nodes: createResizeNodesHandler,
  set_position: createSetPositionHandler,
  set_mask: createSetMaskHandler,
  set_arc: createSetArcHandler,
  repeat_nodes: createRepeatNodesHandler,
  set_repeat: createSetRepeatHandler,
  rotate_nodes: createRotateNodesHandler,
  flip_nodes: createFlipNodesHandler,
  lock_nodes: createLockNodesHandler,
  unlock_nodes: createUnlockNodesHandler,
  clone_node: createCloneNodeHandler,
  group_nodes: createGroupNodesHandler,
  ungroup_nodes: createUngroupNodesHandler,
  reparent_nodes: createReparentNodesHandler,
  reorder_nodes: createReorderNodesHandler,
  batch_rename_nodes: createBatchRenameNodesHandler,
  import_image: createImportImageHandler,
  import_svg: createImportSvgHandler,
  create_ellipse: createCreateEllipseHandler,
  create_section: createCreateSectionHandler,
};
