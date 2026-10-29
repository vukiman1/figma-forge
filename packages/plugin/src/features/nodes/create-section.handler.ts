import { CREATE_SECTION_TOOL_NAME as TOOL, createSectionParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { createdResult, isSized, setNameAndPosition } from './new-node.js';
import { placeNode } from './place-node.js';

export const createCreateSectionHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, createSectionParams, raw);
    const section = figmaCtx.createSection();
    if (isSized(params)) section.resizeWithoutConstraints(params.width, params.height);
    setNameAndPosition(section, params);
    await placeNode(figmaCtx, section, params.parentId, TOOL);
    return createdResult(section);
  };
