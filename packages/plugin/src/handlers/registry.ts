import type { SandboxHandlers } from '../dispatcher.js';
import { createAddComponentPropertyHandler } from '../features/components/add-component-property.handler.js';
import { createBindComponentPropertyHandler } from '../features/components/bind-component-property.handler.js';
import { createCombineAsVariantsHandler } from '../features/components/combine-as-variants.handler.js';
import { createCreateComponentHandler } from '../features/components/create-component.handler.js';
import { createCreateInstanceHandler } from '../features/components/create-instance.handler.js';
import { createDeleteComponentPropertyHandler } from '../features/components/delete-component-property.handler.js';
import { createDetachInstanceHandler } from '../features/components/detach-instance.handler.js';
import { createEditComponentPropertyHandler } from '../features/components/edit-component-property.handler.js';
import { createGetComponentApiHandler } from '../features/components/get-component-api.handler.js';
import { createGetLocalComponentsHandler } from '../features/components/get-local-components.handler.js';
import { createSetInstancePropertiesHandler } from '../features/components/set-instance-properties.handler.js';
import { createSwapComponentHandler } from '../features/components/swap-component.handler.js';
import { createSetAutoLayoutHandler } from '../features/layout/set-auto-layout.handler.js';
import { createSetConstraintsHandler } from '../features/layout/set-constraints.handler.js';
import { createSetLayoutGridsHandler } from '../features/layout/set-layout-grids.handler.js';
import { createSetLayoutPropsHandler } from '../features/layout/set-layout-props.handler.js';
import { createApplyAnimationStyleHandler } from '../features/motion/apply-animation-style.handler.js';
import { createApplyManualKeyframeTrackHandler } from '../features/motion/apply-manual-keyframe-track.handler.js';
import { createGetMotionContextHandler } from '../features/motion/get-motion-context.handler.js';
import { createGetMotionStylesHandler } from '../features/motion/get-motion-styles.handler.js';
import { createGetNodeMotionHandler } from '../features/motion/get-node-motion.handler.js';
import { createRemoveAnimationStyleHandler } from '../features/motion/remove-animation-style.handler.js';
import { createRemoveManualKeyframeTrackHandler } from '../features/motion/remove-manual-keyframe-track.handler.js';
import { createSetTimelineDurationHandler } from '../features/motion/set-timeline-duration.handler.js';
import { createSetBlendModeHandler } from '../features/paint/set-blend-mode.handler.js';
import { createSetComplexStrokeHandler } from '../features/paint/set-complex-stroke.handler.js';
import { createSetCornerRadiusHandler } from '../features/paint/set-corner-radius.handler.js';
import { createSetEffectsHandler } from '../features/paint/set-effects.handler.js';
import { createSetFillsHandler } from '../features/paint/set-fills.handler.js';
import { createSetImageFillHandler } from '../features/paint/set-image-fill.handler.js';
import { createSetOpacityHandler } from '../features/paint/set-opacity.handler.js';
import { createSetStrokesHandler } from '../features/paint/set-strokes.handler.js';
import { createGetReactionsHandler } from '../features/prototype/get-reactions.handler.js';
import { createRemoveReactionsHandler } from '../features/prototype/remove-reactions.handler.js';
import { createSetReactionsHandler } from '../features/prototype/set-reactions.handler.js';
import { createUpdateFlowsHandler } from '../features/prototype/update-flows.handler.js';
import { createApplyStyleToNodeHandler } from '../features/styles/apply-style-to-node.handler.js';
import { createCreateEffectStyleHandler } from '../features/styles/create-effect-style.handler.js';
import { createCreateGridStyleHandler } from '../features/styles/create-grid-style.handler.js';
import { createCreatePaintStyleHandler } from '../features/styles/create-paint-style.handler.js';
import { createCreateTextStyleHandler } from '../features/styles/create-text-style.handler.js';
import { createDeleteStyleHandler } from '../features/styles/delete-style.handler.js';
import { createGetStylesHandler } from '../features/styles/get-styles.handler.js';
import { createImportStyleHandler } from '../features/styles/import-style.handler.js';
import { createUpdateEffectStyleHandler } from '../features/styles/update-effect-style.handler.js';
import { createUpdatePaintStyleHandler } from '../features/styles/update-paint-style.handler.js';
import { createUpdateTextStyleHandler } from '../features/styles/update-text-style.handler.js';
import { createCreateTextPathHandler } from '../features/text/create-text-path.handler.js';
import { createFindReplaceTextHandler } from '../features/text/find-replace-text.handler.js';
import { createSetTextPathHandler } from '../features/text/set-text-path.handler.js';
import { createSetTextPropertiesHandler } from '../features/text/set-text-properties.handler.js';
import { createSetTextRangeHandler } from '../features/text/set-text-range.handler.js';
import { createSetTextHandler } from '../features/text/set-text.handler.js';
import { createAddVariableModeHandler } from '../features/variables/add-variable-mode.handler.js';
import { createBindVariableToNodeHandler } from '../features/variables/bind-variable-to-node.handler.js';
import { createBindVariableToPaintHandler } from '../features/variables/bind-variable-to-paint.handler.js';
import { createCreateVariableCollectionHandler } from '../features/variables/create-variable-collection.handler.js';
import { createCreateVariableHandler } from '../features/variables/create-variable.handler.js';
import { createDeleteVariableCollectionHandler } from '../features/variables/delete-variable-collection.handler.js';
import { createDeleteVariableModeHandler } from '../features/variables/delete-variable-mode.handler.js';
import { createDeleteVariableHandler } from '../features/variables/delete-variable.handler.js';
import { createGetVariableDefsHandler } from '../features/variables/get-variable-defs.handler.js';
import { createImportVariableHandler } from '../features/variables/import-variable.handler.js';
import { createRenameVariableHandler } from '../features/variables/rename-variable.handler.js';
import { createSetNodeVariableModeHandler } from '../features/variables/set-node-variable-mode.handler.js';
import { createSetVariableCodeSyntaxHandler } from '../features/variables/set-variable-code-syntax.handler.js';
import { createSetVariableValueHandler } from '../features/variables/set-variable-value.handler.js';
import { createUpdateVariableCollectionHandler } from '../features/variables/update-variable-collection.handler.js';
import { createIdempotencyCache, idempotent } from '../idempotency.js';
import { withInstanceIdLookup } from '../node-lookup.js';
import { createAddPageHandler } from './add-page.js';
import { createAlignNodesHandler } from './align-nodes.js';
import { createBatchRenameNodesHandler } from './batch-rename-nodes.js';
import { createBatchHandler } from './batch.js';
import { createBooleanNodesHandler } from './boolean-nodes.js';
import { createCloneNodeHandler } from './clone-node.js';
import { createCreateEllipseHandler } from './create-ellipse.js';
import { createCreateFrameHandler } from './create-frame.js';
import { createCreateRectangleHandler } from './create-rectangle.js';
import { createCreateSectionHandler } from './create-section.js';
import { createCreateShapeHandler } from './create-shape.js';
import { createCreateTextHandler } from './create-text.js';
import { createDeleteNodesHandler } from './delete-nodes.js';
import { createDeletePageHandler } from './delete-page.js';
import { createExportPdfHandler } from './export-pdf.js';
import { createExportVideoHandler } from './export-video.js';
import { createFlattenNodesHandler } from './flatten-nodes.js';
import { createFlipNodesHandler } from './flip-nodes.js';
import { createGetAnnotationsHandler } from './get-annotations.js';
import { createGetDesignContextHandler } from './get-design-context.js';
import { createGetDocumentHandler } from './get-document.js';
import { createGetFontsHandler } from './get-fonts.js';
import { createGetMetadataHandler } from './get-metadata.js';
import { createGetNodeHandler } from './get-node.js';
import { createGetNodesInfoHandler } from './get-nodes-info.js';
import { createGetPagesHandler } from './get-pages.js';
import { createGetScreenshotHandler } from './get-screenshot.js';
import { createGetSelectionHandler } from './get-selection.js';
import { createGetViewportHandler } from './get-viewport.js';
import { createGroupNodesHandler } from './group-nodes.js';
import { createImportImageHandler } from './import-image.js';
import { createImportSvgHandler } from './import-svg.js';
import { createListFilesHandler } from './list-files.js';
import { createSetLockedHandler } from './lock-nodes.js';
import { createMoveNodesHandler } from './move-nodes.js';
import { createNavigateToPageHandler } from './navigate-to-page.js';
import { createPingHandler } from './ping.js';
import { createRenameNodeHandler } from './rename-node.js';
import { createRenamePageHandler } from './rename-page.js';
import { createReorderNodesHandler } from './reorder-nodes.js';
import { createReparentNodesHandler } from './reparent-nodes.js';
import { createRepeatNodesHandler, createSetRepeatHandler } from './repeat.js';
import { createResizeNodesHandler } from './resize-nodes.js';
import { createRotateNodesHandler } from './rotate-nodes.js';
import { createSaveImageFillsHandler } from './save-image-fills.js';
import { createScanNodesByTypesHandler } from './scan-nodes-by-types.js';
import { createScanTextNodesHandler } from './scan-text-nodes.js';
import { createSearchNodesHandler } from './search-nodes.js';
import { createSetArcHandler } from './set-arc.js';
import { createSetMaskHandler } from './set-mask.js';
import { createSetPositionHandler } from './set-position.js';
import { createSetVisibleHandler } from './set-visible.js';
import { createUngroupNodesHandler } from './ungroup-nodes.js';
import {
  createCreateVectorHandler,
  createGetVectorHandler,
  createOutlineStrokeHandler,
  createSetVectorHandler,
} from './vector.js';

/**
 * Build the full sandbox handler map. Read handlers run as-is; write handlers are wrapped with
 * idempotency (same requestId applies once). `batch` calls the un-wrapped writes directly — it
 * carries one requestId and is itself idempotent, so per-op deduping would double-count.
 *
 * Wiring lives here (not in code.ts) so a registry test can enumerate the keys and assert they
 * match the server's advertised tools — a new tool can't be half-wired without a test failing.
 */
export const createSandboxHandlers = (figmaApi: typeof figma): SandboxHandlers => {
  const figmaCtx = withInstanceIdLookup(figmaApi);
  const cache = createIdempotencyCache();

  const rawWrites: SandboxHandlers = {
    set_fills: createSetFillsHandler(figmaCtx),
    set_text: createSetTextHandler(figmaCtx),
    set_text_properties: createSetTextPropertiesHandler(figmaCtx),
    set_text_range: createSetTextRangeHandler(figmaCtx),
    create_frame: createCreateFrameHandler(figmaCtx),
    set_opacity: createSetOpacityHandler(figmaCtx),
    set_visible: createSetVisibleHandler(figmaCtx),
    rename_node: createRenameNodeHandler(figmaCtx),
    delete_nodes: createDeleteNodesHandler(figmaCtx),
    create_text: createCreateTextHandler(figmaCtx),
    create_rectangle: createCreateRectangleHandler(figmaCtx),
    set_corner_radius: createSetCornerRadiusHandler(figmaCtx),
    set_strokes: createSetStrokesHandler(figmaCtx),
    move_nodes: createMoveNodesHandler(figmaCtx),
    align_nodes: createAlignNodesHandler(figmaCtx),
    create_shape: createCreateShapeHandler(figmaCtx),
    boolean_nodes: createBooleanNodesHandler(figmaCtx),
    flatten_nodes: createFlattenNodesHandler(figmaCtx),
    resize_nodes: createResizeNodesHandler(figmaCtx),
    set_auto_layout: createSetAutoLayoutHandler(figmaCtx),
    set_layout_props: createSetLayoutPropsHandler(figmaCtx),
    set_layout_grids: createSetLayoutGridsHandler(figmaCtx),
    set_position: createSetPositionHandler(figmaCtx),
    set_blend_mode: createSetBlendModeHandler(figmaCtx),
    set_mask: createSetMaskHandler(figmaCtx),
    set_arc: createSetArcHandler(figmaCtx),
    // Figma Draw
    repeat_nodes: createRepeatNodesHandler(figmaCtx),
    set_repeat: createSetRepeatHandler(figmaCtx),
    create_text_path: createCreateTextPathHandler(figmaCtx),
    set_text_path: createSetTextPathHandler(figmaCtx),
    set_complex_stroke: createSetComplexStrokeHandler(figmaCtx),
    create_vector: createCreateVectorHandler(figmaCtx),
    set_vector: createSetVectorHandler(figmaCtx),
    outline_stroke: createOutlineStrokeHandler(figmaCtx),
    set_constraints: createSetConstraintsHandler(figmaCtx),
    rotate_nodes: createRotateNodesHandler(figmaCtx),
    flip_nodes: createFlipNodesHandler(figmaCtx),
    lock_nodes: createSetLockedHandler(figmaCtx, true),
    unlock_nodes: createSetLockedHandler(figmaCtx, false),
    clone_node: createCloneNodeHandler(figmaCtx),
    // Styles
    set_effects: createSetEffectsHandler(figmaCtx),
    create_paint_style: createCreatePaintStyleHandler(figmaCtx),
    create_text_style: createCreateTextStyleHandler(figmaCtx),
    create_effect_style: createCreateEffectStyleHandler(figmaCtx),
    create_grid_style: createCreateGridStyleHandler(figmaCtx),
    update_paint_style: createUpdatePaintStyleHandler(figmaCtx),
    update_text_style: createUpdateTextStyleHandler(figmaCtx),
    update_effect_style: createUpdateEffectStyleHandler(figmaCtx),
    apply_style_to_node: createApplyStyleToNodeHandler(figmaCtx),
    import_style: createImportStyleHandler(figmaCtx),
    delete_style: createDeleteStyleHandler(figmaCtx),
    // Variables
    create_variable_collection: createCreateVariableCollectionHandler(figmaCtx),
    update_variable_collection: createUpdateVariableCollectionHandler(figmaCtx),
    add_variable_mode: createAddVariableModeHandler(figmaCtx),
    create_variable: createCreateVariableHandler(figmaCtx),
    set_variable_value: createSetVariableValueHandler(figmaCtx),
    bind_variable_to_node: createBindVariableToNodeHandler(figmaCtx),
    bind_variable_to_paint: createBindVariableToPaintHandler(figmaCtx),
    import_variable: createImportVariableHandler(figmaCtx),
    set_node_variable_mode: createSetNodeVariableModeHandler(figmaCtx),
    rename_variable: createRenameVariableHandler(figmaCtx),
    set_variable_code_syntax: createSetVariableCodeSyntaxHandler(figmaCtx),
    delete_variable: createDeleteVariableHandler(figmaCtx),
    delete_variable_mode: createDeleteVariableModeHandler(figmaCtx),
    delete_variable_collection: createDeleteVariableCollectionHandler(figmaCtx),
    // Structure + bulk text
    group_nodes: createGroupNodesHandler(figmaCtx),
    ungroup_nodes: createUngroupNodesHandler(figmaCtx),
    reparent_nodes: createReparentNodesHandler(figmaCtx),
    reorder_nodes: createReorderNodesHandler(figmaCtx),
    find_replace_text: createFindReplaceTextHandler(figmaCtx),
    batch_rename_nodes: createBatchRenameNodesHandler(figmaCtx),
    // Pages
    add_page: createAddPageHandler(figmaCtx),
    delete_page: createDeletePageHandler(figmaCtx),
    rename_page: createRenamePageHandler(figmaCtx),
    navigate_to_page: createNavigateToPageHandler(figmaCtx),
    // Prototype + components
    set_reactions: createSetReactionsHandler(figmaCtx),
    remove_reactions: createRemoveReactionsHandler(figmaCtx),
    update_flows: createUpdateFlowsHandler(figmaCtx),
    swap_component: createSwapComponentHandler(figmaCtx),
    set_instance_properties: createSetInstancePropertiesHandler(figmaCtx),
    add_component_property: createAddComponentPropertyHandler(figmaCtx),
    bind_component_property: createBindComponentPropertyHandler(figmaCtx),
    edit_component_property: createEditComponentPropertyHandler(figmaCtx),
    delete_component_property: createDeleteComponentPropertyHandler(figmaCtx),
    detach_instance: createDetachInstanceHandler(figmaCtx),
    import_image: createImportImageHandler(figmaCtx),
    set_image_fill: createSetImageFillHandler(figmaCtx),
    import_svg: createImportSvgHandler(figmaCtx),
    create_ellipse: createCreateEllipseHandler(figmaCtx),
    create_component: createCreateComponentHandler(figmaCtx),
    create_section: createCreateSectionHandler(figmaCtx),
    create_instance: createCreateInstanceHandler(figmaCtx),
    combine_as_variants: createCombineAsVariantsHandler(figmaCtx),
    // Motion (beta) — Figma Design only
    apply_animation_style: createApplyAnimationStyleHandler(figmaCtx),
    remove_animation_style: createRemoveAnimationStyleHandler(figmaCtx),
    apply_manual_keyframe_track: createApplyManualKeyframeTrackHandler(figmaCtx),
    remove_manual_keyframe_track: createRemoveManualKeyframeTrackHandler(figmaCtx),
    set_timeline_duration: createSetTimelineDurationHandler(figmaCtx),
  };

  const handlers: SandboxHandlers = {
    ping: createPingHandler(figmaCtx),
    get_selection: createGetSelectionHandler(figmaCtx),
    get_document: createGetDocumentHandler(figmaCtx),
    get_node: createGetNodeHandler(figmaCtx),
    get_vector: createGetVectorHandler(figmaCtx),
    get_nodes_info: createGetNodesInfoHandler(figmaCtx),
    get_metadata: createGetMetadataHandler(figmaCtx),
    get_pages: createGetPagesHandler(figmaCtx),
    search_nodes: createSearchNodesHandler(figmaCtx),
    scan_text_nodes: createScanTextNodesHandler(figmaCtx),
    scan_nodes_by_types: createScanNodesByTypesHandler(figmaCtx),
    get_styles: createGetStylesHandler(figmaCtx),
    get_variable_defs: createGetVariableDefsHandler(figmaCtx),
    get_local_components: createGetLocalComponentsHandler(figmaCtx),
    get_component_api: createGetComponentApiHandler(figmaCtx),
    get_viewport: createGetViewportHandler(figmaCtx),
    get_fonts: createGetFontsHandler(figmaCtx),
    get_annotations: createGetAnnotationsHandler(figmaCtx),
    get_reactions: createGetReactionsHandler(figmaCtx),
    get_motion_styles: createGetMotionStylesHandler(figmaCtx),
    get_node_motion: createGetNodeMotionHandler(figmaCtx),
    get_motion_context: createGetMotionContextHandler(figmaCtx),
    list_files: createListFilesHandler(figmaCtx),
    get_design_context: createGetDesignContextHandler(figmaCtx),
    get_screenshot: createGetScreenshotHandler(figmaCtx),
    save_image_fills: createSaveImageFillsHandler(figmaCtx),
    export_pdf: createExportPdfHandler(figmaCtx),
    export_video: createExportVideoHandler(figmaCtx),
  };

  for (const name of Object.keys(rawWrites)) {
    handlers[name] = idempotent(cache, rawWrites[name]!);
  }
  handlers.batch = idempotent(cache, createBatchHandler(figmaCtx, rawWrites));

  return handlers;
};
