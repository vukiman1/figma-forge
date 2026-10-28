import { IMPORT_SVG_TOOL_NAME as TOOL, importSvgParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { createdResult, setNameAndPosition } from './new-node.js';
import { placeNode } from './place-node.js';
import { svgColorsToDocument } from './svg-colors.js';

export const createImportSvgHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { svg, width, height, ...params } = parseParams(TOOL, importSvgParams, raw);
    const node = figmaCtx.createNodeFromSvg(svg);
    svgColorsToDocument(figmaCtx, node);
    if (width !== undefined || height !== undefined) {
      node.resize(width ?? node.width, height ?? node.height);
    }
    setNameAndPosition(node, params);
    await placeNode(figmaCtx, node, params.parentId, TOOL);
    return createdResult(node);
  };
