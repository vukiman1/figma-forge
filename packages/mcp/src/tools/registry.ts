// Single source of truth for what the MCP server advertises and which tools are writes. index.ts
// registers every spec with McpServer (which generates the advertised JSON Schema from each Zod
// inputSchema); the write set is derived from `kind`, not maintained by hand. A registry test asserts
// these stay in sync with the plugin's handler map so a new tool can't be half-wired.

import {
  addComponentPropertyTool,
  addPageTool,
  addVariableModeTool,
  alignNodesTool,
  applyAnimationStyleTool,
  applyManualKeyframeTrackTool,
  applyStyleToNodeTool,
  batchRenameNodesTool,
  batchTool,
  bindComponentPropertyTool,
  bindVariableToNodeTool,
  bindVariableToPaintTool,
  booleanNodesTool,
  cloneNodeTool,
  combineAsVariantsTool,
  createComponentTool,
  createEffectStyleTool,
  createEllipseTool,
  createFrameTool,
  createGridStyleTool,
  createInstanceTool,
  createPaintStyleTool,
  createRectangleTool,
  createSectionTool,
  createShapeTool,
  createTextPathTool,
  createTextStyleTool,
  createTextTool,
  createVariableCollectionTool,
  createVariableTool,
  createVectorTool,
  deleteComponentPropertyTool,
  deleteNodesTool,
  deletePageTool,
  deleteStyleTool,
  deleteVariableCollectionTool,
  deleteVariableModeTool,
  deleteVariableTool,
  detachInstanceTool,
  editComponentPropertyTool,
  findReplaceTextTool,
  flattenNodesTool,
  flipNodesTool,
  getAnnotationsTool,
  getComponentApiTool,
  getDesignContextTool,
  getDocumentTool,
  getFontsTool,
  getLocalComponentsTool,
  getMetadataTool,
  getMotionContextTool,
  getMotionStylesTool,
  getNodeMotionTool,
  getNodeTool,
  getNodesInfoTool,
  getPagesTool,
  getReactionsTool,
  getSelectionTool,
  getStylesTool,
  getVariableDefsTool,
  getVectorTool,
  getViewportTool,
  groupNodesTool,
  importStyleTool,
  importSvgTool,
  importVariableTool,
  lockNodesTool,
  moveNodesTool,
  navigateToPageTool,
  outlineStrokeTool,
  removeAnimationStyleTool,
  removeManualKeyframeTrackTool,
  removeReactionsTool,
  renameNodeTool,
  renamePageTool,
  renameVariableTool,
  reorderNodesTool,
  reparentNodesTool,
  repeatNodesTool,
  resizeNodesTool,
  rotateNodesTool,
  scanNodesByTypesTool,
  scanTextNodesTool,
  searchNodesTool,
  setArcTool,
  setAutoLayoutTool,
  setBlendModeTool,
  setComplexStrokeTool,
  setConstraintsTool,
  setCornerRadiusTool,
  setEffectsTool,
  setFillsTool,
  setImageFillTool,
  setInstancePropertiesTool,
  setLayoutGridsTool,
  setLayoutPropsTool,
  setMaskTool,
  setNodeVariableModeTool,
  setOpacityTool,
  setPositionTool,
  setReactionsTool,
  setRepeatTool,
  setStrokesTool,
  setTextPathTool,
  setTextPropertiesTool,
  setTextRangeTool,
  setTextTool,
  setTimelineDurationTool,
  setVariableCodeSyntaxTool,
  setVariableValueTool,
  setVectorTool,
  setVisibleTool,
  type ToolSpec,
  swapComponentTool,
  ungroupNodesTool,
  unlockNodesTool,
  updateEffectStyleTool,
  updateFlowsTool,
  updatePaintStyleTool,
  updateTextStyleTool,
  updateVariableCollectionTool,
} from '@figma-forge/core';
import { z } from 'zod';

import { analyzeProjectTool } from './analyze-project.js';
import { componentMapTool } from './component-map.js';
import { designDiffTool } from './design-diff.js';
import { exportPdfTool } from './export-pdf.js';
import { exportVideoTool } from './export-video.js';
import { getScreenshotTool } from './get-screenshot.js';
import { iconMapTool } from './icon-map.js';
import { importImageTool } from './import-image.js';
import { listFilesTool } from './list-files.js';
import { pingTool } from './ping.js';
import { saveImageFillsTool } from './save-image-fills.js';
import { saveScreenshotsTool } from './save-screenshots.js';
import { scanComponentsTool } from './scan-components.js';
import { tokenMapTool } from './token-map.js';
import { useFileTool } from './use-file.js';

/**
 * Every tool the MCP server registers, in ListTools order.
 *
 * Declared here, then handed through {@linkcode strictArgs} so no tool can accept an argument it
 * does not declare.
 */
const DECLARED_TOOL_SPECS: readonly ToolSpec[] = [
  // Reads
  pingTool,
  getSelectionTool,
  getDocumentTool,
  getNodeTool,
  getNodesInfoTool,
  getVectorTool,
  getMetadataTool,
  getPagesTool,
  searchNodesTool,
  scanTextNodesTool,
  scanNodesByTypesTool,
  getStylesTool,
  getVariableDefsTool,
  getLocalComponentsTool,
  getComponentApiTool,
  getViewportTool,
  getFontsTool,
  getAnnotationsTool,
  getReactionsTool,
  getMotionStylesTool,
  getNodeMotionTool,
  getMotionContextTool,
  listFilesTool,
  useFileTool,
  getDesignContextTool,
  getScreenshotTool,
  saveScreenshotsTool,
  saveImageFillsTool,
  exportPdfTool,
  exportVideoTool,
  // Server-local (filesystem; no plugin handler — like save_screenshots). analyze_project is an
  // optional standalone probe; scan_components / component_map also run detection internally.
  analyzeProjectTool,
  scanComponentsTool,
  componentMapTool,
  tokenMapTool,
  iconMapTool,
  designDiffTool,
  // Writes
  setFillsTool,
  setTextTool,
  setTextPropertiesTool,
  setTextRangeTool,
  createFrameTool,
  setOpacityTool,
  setVisibleTool,
  renameNodeTool,
  deleteNodesTool,
  createTextTool,
  createRectangleTool,
  setCornerRadiusTool,
  setStrokesTool,
  moveNodesTool,
  alignNodesTool,
  createShapeTool,
  booleanNodesTool,
  flattenNodesTool,
  // Figma Draw
  repeatNodesTool,
  setRepeatTool,
  createTextPathTool,
  setTextPathTool,
  setComplexStrokeTool,
  // Vector geometry
  createVectorTool,
  setVectorTool,
  outlineStrokeTool,
  setPositionTool,
  resizeNodesTool,
  setAutoLayoutTool,
  setLayoutPropsTool,
  setLayoutGridsTool,
  setBlendModeTool,
  setMaskTool,
  setArcTool,
  setConstraintsTool,
  rotateNodesTool,
  flipNodesTool,
  lockNodesTool,
  unlockNodesTool,
  cloneNodeTool,
  setEffectsTool,
  createPaintStyleTool,
  createTextStyleTool,
  createEffectStyleTool,
  createGridStyleTool,
  updatePaintStyleTool,
  updateTextStyleTool,
  updateEffectStyleTool,
  applyStyleToNodeTool,
  importStyleTool,
  deleteStyleTool,
  createVariableCollectionTool,
  updateVariableCollectionTool,
  addVariableModeTool,
  createVariableTool,
  setVariableValueTool,
  bindVariableToNodeTool,
  bindVariableToPaintTool,
  importVariableTool,
  setNodeVariableModeTool,
  renameVariableTool,
  setVariableCodeSyntaxTool,
  deleteVariableTool,
  deleteVariableModeTool,
  deleteVariableCollectionTool,
  groupNodesTool,
  ungroupNodesTool,
  reparentNodesTool,
  reorderNodesTool,
  findReplaceTextTool,
  batchRenameNodesTool,
  addPageTool,
  deletePageTool,
  renamePageTool,
  navigateToPageTool,
  setReactionsTool,
  removeReactionsTool,
  updateFlowsTool,
  swapComponentTool,
  setInstancePropertiesTool,
  addComponentPropertyTool,
  bindComponentPropertyTool,
  editComponentPropertyTool,
  deleteComponentPropertyTool,
  detachInstanceTool,
  importImageTool,
  setImageFillTool,
  importSvgTool,
  createEllipseTool,
  createComponentTool,
  createSectionTool,
  createInstanceTool,
  combineAsVariantsTool,
  // Motion (beta) — Figma Design only
  applyAnimationStyleTool,
  removeAnimationStyleTool,
  applyManualKeyframeTrackTool,
  removeManualKeyframeTrackTool,
  setTimelineDurationTool,
  batchTool,
];

/**
 * Close a tool's argument object, so an argument it never declared is refused instead of dropped.
 *
 * Zod strips unknown keys by default and JSON Schema allows them by default, so both halves of the
 * contract used to say yes to an argument that does nothing. Measured on the wire:
 * `create_variable` with an extra `value` — a field it has never had, since a new variable starts
 * empty and takes its values from `set_variable_value` — passed validation and ran, and the call
 * reported `ok: true` over eight variables that were all still white. Nothing between the model and
 * the canvas could see it; only a screenshot could.
 *
 * That is the shape this exists for. An argument an agent believes in is a belief about what the
 * call did, and a write that silently drops one reports success for something else — the same
 * defect as a stale plugin ignoring a field it predates, which this repo already refuses to let
 * pass quietly (see `pluginSkewNotice`). Rejection is also only half the fix:
 * `additionalProperties: false` now reaches the model in the advertised schema, so the better
 * outcome is the call that is never made.
 *
 * Applied here rather than per tool because all three consumers of a spec read from this one list —
 * the SDK registration, `test/e2e/mcp-wire.test.ts`'s independent derivation, and `wireToolSchema`
 * — so one edit keeps them agreeing. It reaches only the agent-facing surface: `wireToolSchema`
 * rebuilds from `.shape`, leaving the plugin-facing schema exactly as it was. That surface carries
 * server-injected fields it has to declare completely, and closing it has a fail-closed failure
 * mode of its own that wants its own evidence.
 */
const strictArgs = (spec: ToolSpec): ToolSpec => ({
  ...spec,
  inputSchema: z.strictObject(spec.inputSchema.shape),
});

export const ALL_TOOL_SPECS: readonly ToolSpec[] = DECLARED_TOOL_SPECS.map(strictArgs);

/**
 * Write tools get a server-generated requestId (stable across dispatch retries) so the plugin can
 * dedupe side-effects. Reads don't need it. Derived from each spec's kind — no hand-kept list.
 */
export const WRITE_TOOL_NAMES: ReadonlySet<string> = new Set(
  ALL_TOOL_SPECS.filter(spec => spec.kind === 'write').map(spec => spec.name),
);
