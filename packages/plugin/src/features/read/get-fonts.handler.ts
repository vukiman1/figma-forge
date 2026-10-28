import type { GetFontsResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { walk } from '../../traverse.js';
import { variationAxesOf } from './font-axes.js';
import { tallyFonts } from './font-usage.js';

export const createGetFontsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  () => {
    const fonts = tallyFonts(walk(figmaCtx.currentPage.children));
    const variationAxes = variationAxesOf(
      figmaCtx,
      fonts.map(({ fontName }) => fontName.family),
    );
    const result: GetFontsResult = { fonts, ...(variationAxes !== null && { variationAxes }) };
    return result;
  };
