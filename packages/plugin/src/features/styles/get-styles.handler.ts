import type { GetStylesResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { displayP3Marker } from '../color-space.js';
import {
  serializeEffectStyle,
  serializeGridStyle,
  serializePaintStyle,
  serializeTextStyle,
} from './serialize-styles.js';
import { boundVariableIds, resolveStyleVariables } from './style-variables.js';

export const createGetStylesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async () => {
    const [paints, texts, effects, grids] = await Promise.all([
      figmaCtx.getLocalPaintStylesAsync(),
      figmaCtx.getLocalTextStylesAsync(),
      figmaCtx.getLocalEffectStylesAsync(),
      figmaCtx.getLocalGridStylesAsync(),
    ]);
    const result: GetStylesResult = {
      ...displayP3Marker(figmaCtx),
      paints: paints.map(serializePaintStyle),
      texts: texts.map(serializeTextStyle),
      effects: effects.map(serializeEffectStyle),
      grids: grids.map(serializeGridStyle),
    };
    const variables = await resolveStyleVariables(figmaCtx, boundVariableIds(result));
    return variables === undefined ? result : { variables, ...result };
  };
