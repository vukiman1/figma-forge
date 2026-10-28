import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const SET_MASK_TOOL_NAME = 'set_mask';

export const setMaskParams = z.object({
  nodeId: z.string().describe('Figma node id'),
  isMask: z.boolean().describe('Whether the node masks its later siblings'),
  maskType: z
    .enum(['ALPHA', 'VECTOR', 'LUMINANCE'])
    .optional()
    .describe('How the mask clips (only applied when enabling)'),
});

export const setMaskTool: ToolSpec = {
  name: SET_MASK_TOOL_NAME,
  description:
    'Set whether a node is a mask — a mask clips its later siblings to its own shape. Pass isMask ' +
    'true/false, and optionally maskType (ALPHA / VECTOR / LUMINANCE) when enabling. Returns ' +
    '{ ok, nodeId }.',
  inputSchema: setMaskParams,
  kind: 'write',
};
