import { type MutateResult, SET_TEXT_TOOL_NAME as TOOL, setTextParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { loadTextFonts } from './fonts.js';
import { keptEdges, replaceRange } from './text-edit.js';
import { requireTextLike, type TextLike } from './text-like.js';

const replaceKeepingRuns = (text: TextLike, next: string): void => {
  const before = text.characters;
  if (before.length === 0) {
    text.characters = next;
    return;
  }
  const { prefix, suffix } = keptEdges(text, next);
  replaceRange(text, prefix, before.length - suffix, next.slice(prefix, next.length - suffix));
};

export const createSetTextHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, characters } = parseParams(TOOL, setTextParams, raw);
    const text = await requireTextLike(figmaCtx, TOOL, nodeId);
    await loadTextFonts(figmaCtx, text);
    replaceKeepingRuns(text, characters);
    const result: MutateResult = { ok: true, nodeId: text.id };
    return result;
  };
