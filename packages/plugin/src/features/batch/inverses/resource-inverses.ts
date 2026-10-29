import type { BatchInverse } from '../inverse.js';
import { bindComponentPropertyInverse } from './bind-component-property.js';
import {
  addComponentPropertyInverse,
  editComponentPropertyInverse,
} from './component-properties.js';
import {
  addVariableModeInverse,
  createEffectStyleInverse,
  createGridStyleInverse,
  createPaintStyleInverse,
  createTextStyleInverse,
  createVariableCollectionInverse,
  createVariableInverse,
} from './created-resources.js';
import {
  addPageInverse,
  cloneNodeInverse,
  createComponentInverse,
  createEllipseInverse,
  createFrameInverse,
  createInstanceInverse,
  createRectangleInverse,
  createSectionInverse,
  createShapeInverse,
  createTextInverse,
  createVectorInverse,
  importImageInverse,
  importSvgInverse,
} from './creates.js';
import { setInstancePropertiesInverse, swapComponentInverse } from './instances.js';
import { applyManualKeyframeTrackInverse } from './keyframe-track.js';
import { applyAnimationStyleInverse, setTimelineDurationInverse } from './motion.js';
import { applyStyleToNodeInverse } from './node-style.js';
import { navigateToPageInverse, renamePageInverse } from './pages.js';
import { removeReactionsInverse, setReactionsInverse } from './reactions.js';
import { updateEffectStyleInverse, updatePaintStyleInverse } from './shared-styles.js';
import { updateTextStyleInverse } from './text-style.js';
import { updateFlowsInverse } from './update-flows.js';
import { bindVariableToNodeInverse, bindVariableToPaintInverse } from './variable-bindings.js';
import {
  renameVariableInverse,
  setVariableCodeSyntaxInverse,
  updateVariableCollectionInverse,
} from './variable-metadata.js';
import { setNodeVariableModeInverse } from './variable-mode.js';
import { setVariableValueInverse } from './variable-value.js';

export const RESOURCE_INVERSES: Readonly<Record<string, BatchInverse>> = {
  apply_style_to_node: applyStyleToNodeInverse,
  bind_variable_to_node: bindVariableToNodeInverse,
  set_node_variable_mode: setNodeVariableModeInverse,
  bind_variable_to_paint: bindVariableToPaintInverse,
  set_instance_properties: setInstancePropertiesInverse,
  swap_component: swapComponentInverse,
  create_frame: createFrameInverse,
  create_rectangle: createRectangleInverse,
  create_text: createTextInverse,
  create_ellipse: createEllipseInverse,
  create_shape: createShapeInverse,
  create_component: createComponentInverse,
  create_section: createSectionInverse,
  import_image: importImageInverse,
  import_svg: importSvgInverse,
  create_vector: createVectorInverse,
  create_instance: createInstanceInverse,
  clone_node: cloneNodeInverse,
  add_page: addPageInverse,
  create_paint_style: createPaintStyleInverse,
  create_effect_style: createEffectStyleInverse,
  create_grid_style: createGridStyleInverse,
  create_text_style: createTextStyleInverse,
  create_variable_collection: createVariableCollectionInverse,
  create_variable: createVariableInverse,
  add_variable_mode: addVariableModeInverse,
  add_component_property: addComponentPropertyInverse,
  update_paint_style: updatePaintStyleInverse,
  update_effect_style: updateEffectStyleInverse,
  update_text_style: updateTextStyleInverse,
  set_variable_value: setVariableValueInverse,
  set_variable_code_syntax: setVariableCodeSyntaxInverse,
  rename_variable: renameVariableInverse,
  update_variable_collection: updateVariableCollectionInverse,
  edit_component_property: editComponentPropertyInverse,
  bind_component_property: bindComponentPropertyInverse,
  set_reactions: setReactionsInverse,
  remove_reactions: removeReactionsInverse,
  update_flows: updateFlowsInverse,
  rename_page: renamePageInverse,
  navigate_to_page: navigateToPageInverse,
  apply_animation_style: applyAnimationStyleInverse,
  apply_manual_keyframe_track: applyManualKeyframeTrackInverse,
  set_timeline_duration: setTimelineDurationInverse,
};
