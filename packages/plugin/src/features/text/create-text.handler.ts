import { CREATE_TEXT_TOOL_NAME as TOOL, createTextParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { applyInitialProps } from '../nodes/initial-props.js';
import { createdResult, setNameAndPosition } from '../nodes/new-node.js';
import { placeNode } from '../nodes/place-node.js';
import { parseParams } from '../parse-params.js';
import { loadTextFonts } from './fonts.js';

export const createCreateTextHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { characters, x, y, ...params } = parseParams(TOOL, createTextParams, raw);
    const text = figmaCtx.createText();
    await loadTextFonts(figmaCtx, text);
    text.characters = characters;
    setNameAndPosition(text, { x, y });
    await placeNode(figmaCtx, text, params.parentId, TOOL);
    await applyInitialProps(figmaCtx, text, params, TOOL);
    return createdResult(text);
  };
