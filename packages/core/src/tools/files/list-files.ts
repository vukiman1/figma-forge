import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const LIST_FILES_TOOL_NAME = 'list_files';

export const listFilesParams = z.object({});

export const listFilesTool: ToolSpec = {
  name: LIST_FILES_TOOL_NAME,
  description:
    'Return every Figma file that currently has the Figma Forge plugin open, as { files: [{ sessionId, ' +
    'fileName, currentPage, pluginVersion, routed, bound, duplicateName?, error? }] }. More than one ' +
    'entry means more than one file is reachable, and calls follow whichever one the user last ' +
    'touched (routed: true) — which changes under you when they switch tabs. Claim one with ' +
    'use_file so this agent stays in it. bound marks the file this agent has claimed. ' +
    'duplicateName marks entries sharing a name (Figma allows it; "x (Copy)" is the usual way), ' +
    'for which use_file needs the sessionId rather than the name. fileKey is always null: only ' +
    'private-org plugins can read it.',
  inputSchema: listFilesParams,
  kind: 'read',
};
