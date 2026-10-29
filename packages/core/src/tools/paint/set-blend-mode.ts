import { z } from 'zod';

import { blendModeSchema } from '../shared/blend-mode-schema.js';
import type { ToolSpec } from '../tool-spec.js';

export const SET_BLEND_MODE_TOOL_NAME = 'set_blend_mode';

export const setBlendModeParams = z.object({
  nodeId: z.string().describe('Node to set the blend mode on'),
  blendMode: blendModeSchema.describe('Figma blend mode literal, e.g. "MULTIPLY"'),
});

export const setBlendModeTool: ToolSpec = {
  name: SET_BLEND_MODE_TOOL_NAME,
  description:
    'Set how a node composites with the layers beneath it (NORMAL, MULTIPLY, SCREEN, OVERLAY, ' +
    'DARKEN, LIGHTEN, COLOR_DODGE, etc.). PASS_THROUGH is only meaningful on groups/frames (lets ' +
    "children blend with content outside the group). Affects compositing only, not the node's own " +
    'fills — use set_fills or set_opacity for those. Returns { ok, nodeId }.',
  inputSchema: setBlendModeParams,
  kind: 'write',
};
