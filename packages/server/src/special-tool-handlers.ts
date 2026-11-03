import {
  ANALYZE_PROJECT_TOOL_NAME,
  COMPONENT_MAP_TOOL_NAME,
  DESIGN_DIFF_TOOL_NAME,
  EXPORT_PDF_TOOL_NAME,
  EXPORT_VIDEO_TOOL_NAME,
  GET_DESIGN_CONTEXT_TOOL_NAME,
  GET_SCREENSHOT_TOOL_NAME,
  GetScreenshotResultSchema,
  ICON_MAP_TOOL_NAME,
  LIST_FILES_TOOL_NAME,
  pingTool,
  SAVE_IMAGE_FILLS_TOOL_NAME,
  SAVE_SCREENSHOTS_TOOL_NAME,
  SCAN_COMPONENTS_TOOL_NAME,
  SCAN_NODES_BY_TYPES_TOOL_NAME,
  SCAN_TEXT_NODES_TOOL_NAME,
  SEARCH_NODES_TOOL_NAME,
  TOKEN_MAP_TOOL_NAME,
  USE_FILE_TOOL_NAME,
} from '@figma-forge/core';
import { z } from 'zod';

import { BUILD_ID } from './build-id.js';
import { log, SERVER_VERSION } from './server-config.js';
import type { ServerRuntime } from './server-runtime.js';
import type { ToolDispatch, ToolDispatchers } from './tool-dispatchers.js';
import { textResult, type ToolHandler } from './tool-handler.js';
import { handleAnalyzeProject } from './tools/codegen/analyze-project.handler.js';
import { handleComponentMap } from './tools/codegen/component-map.handler.js';
import { handleDesignDiff } from './tools/codegen/design-diff.handler.js';
import { handleIconMap } from './tools/codegen/icon-map.handler.js';
import { handleScanComponents } from './tools/codegen/scan-components.handler.js';
import { handleTokenMap } from './tools/codegen/token-map.handler.js';
import { handleExportPdf } from './tools/export/export-pdf.handler.js';
import { handleExportVideo } from './tools/export/export-video.handler.js';
import { screenshotContent } from './tools/export/get-screenshot.handler.js';
import { handleSaveImageFills } from './tools/export/save-image-fills.handler.js';
import { handleSaveScreenshots } from './tools/export/save-screenshots.handler.js';
import { handleListFiles } from './tools/files/list-files.handler.js';
import { formatPingResult, handlePing } from './tools/files/ping.handler.js';
import { handleUseFile } from './tools/files/use-file.handler.js';
import { handleDesignContext } from './tools/read/design-context-guard.js';
import { fitNodeList } from './tools/result/result-budget.js';

const NodeListWireResultSchema = z.object({
  note: z.string().optional(),
  matchCount: z.number().int().nonnegative().optional(),
  nodes: z.array(z.record(z.string(), z.unknown())),
});

const nodeListHandler =
  (dispatch: ToolDispatch, toolName: string, narrowWith: string): ToolHandler =>
  async args =>
    textResult(
      fitNodeList(NodeListWireResultSchema.parse(await dispatch(toolName, args)), narrowWith),
    );

const createPingHandler =
  (runtime: ServerRuntime): ToolHandler =>
  async () => ({
    content: [
      {
        type: 'text',
        text: formatPingResult(
          await handlePing({
            node: runtime.node,
            follower: runtime.follower,
            serverVersion: SERVER_VERSION,
            buildId: BUILD_ID,
            log,
            pluginInstall: runtime.pluginInstall,
          }),
        ),
      },
    ],
  });

const createMediaHandlers = (dispatch: ToolDispatch): Readonly<Record<string, ToolHandler>> => ({
  [SAVE_SCREENSHOTS_TOOL_NAME]: async args =>
    textResult(await handleSaveScreenshots(dispatch, args)),
  [SAVE_IMAGE_FILLS_TOOL_NAME]: async args =>
    textResult(await handleSaveImageFills(dispatch, args)),
  [EXPORT_PDF_TOOL_NAME]: async args => textResult(await handleExportPdf(dispatch, args)),
  [EXPORT_VIDEO_TOOL_NAME]: async args => textResult(await handleExportVideo(dispatch, args)),
  [GET_SCREENSHOT_TOOL_NAME]: async args => ({
    content: screenshotContent(
      GetScreenshotResultSchema.parse(
        await dispatch(GET_SCREENSHOT_TOOL_NAME, { ...args, forVision: true }),
      ),
    ),
  }),
});

const createRoutingHandlers = (
  dispatchers: ToolDispatchers,
): Readonly<Record<string, ToolHandler>> => ({
  [LIST_FILES_TOOL_NAME]: async () =>
    textResult(
      await handleListFiles(await dispatchers.listSessions(), dispatchers.dispatchToSession),
    ),
  [USE_FILE_TOOL_NAME]: async args =>
    textResult(await handleUseFile(args, dispatchers.listSessions, dispatchers.dispatchToSession)),
});

const createNodeListHandlers = (dispatch: ToolDispatch): Readonly<Record<string, ToolHandler>> => ({
  [SEARCH_NODES_TOOL_NAME]: nodeListHandler(
    dispatch,
    SEARCH_NODES_TOOL_NAME,
    'pass root (a frame or section id) to scope it, or a narrower name or type',
  ),
  [SCAN_NODES_BY_TYPES_TOOL_NAME]: nodeListHandler(
    dispatch,
    SCAN_NODES_BY_TYPES_TOOL_NAME,
    'pass root (a frame or section id) to scope it, or ask for fewer types',
  ),
  [SCAN_TEXT_NODES_TOOL_NAME]: nodeListHandler(
    dispatch,
    SCAN_TEXT_NODES_TOOL_NAME,
    'pass root (a frame or section id) to scope it',
  ),
});

const createGroundingHandlers = (
  dispatchers: ToolDispatchers,
): Readonly<Record<string, ToolHandler>> => ({
  [ANALYZE_PROJECT_TOOL_NAME]: async args => textResult(await handleAnalyzeProject(args)),
  [SCAN_COMPONENTS_TOOL_NAME]: async args => textResult(await handleScanComponents(args)),
  [COMPONENT_MAP_TOOL_NAME]: async args =>
    textResult(await handleComponentMap(await dispatchers.routedDispatch(), args)),
  [TOKEN_MAP_TOOL_NAME]: async args => textResult(await handleTokenMap(dispatchers.dispatch, args)),
  [ICON_MAP_TOOL_NAME]: async args =>
    textResult(await handleIconMap(await dispatchers.routedDispatch(), args)),
  [DESIGN_DIFF_TOOL_NAME]: async args =>
    textResult(await handleDesignDiff(dispatchers.dispatch, args)),
  [GET_DESIGN_CONTEXT_TOOL_NAME]: async args =>
    textResult(await handleDesignContext(dispatchers.dispatch, args)),
});

export const createSpecialToolHandlers = (
  runtime: ServerRuntime,
  dispatchers: ToolDispatchers,
): Readonly<Record<string, ToolHandler>> => {
  return {
    [pingTool.name]: createPingHandler(runtime),
    ...createMediaHandlers(dispatchers.dispatch),
    ...createRoutingHandlers(dispatchers),
    ...createNodeListHandlers(dispatchers.dispatch),
    ...createGroundingHandlers(dispatchers),
  };
};
