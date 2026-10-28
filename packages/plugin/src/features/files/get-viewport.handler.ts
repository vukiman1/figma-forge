import type { GetViewportResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';

export const createGetViewportHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  () => {
    const { center, zoom, bounds } = figmaCtx.viewport;
    const result: GetViewportResult = {
      center: { x: center.x, y: center.y },
      zoom,
      bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    };
    return result;
  };
