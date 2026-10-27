import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const PING_TOOL_NAME = 'ping';

export const pingTool: ToolSpec = {
  name: PING_TOOL_NAME,
  description:
    'Health check. Returns server info plus, when a plugin is connected, end-to-end info from the ' +
    'Figma sandbox. On a follower it also reports the leader’s version and build, and warns ' +
    '(versionSkew / buildSkew) when a stale older server still owns the plugin. sessions.all names ' +
    'each connected file as of its last activity, so a file whose tab has not been in front since ' +
    'it connected shows fileName: null — use list_files, which asks each plugin directly, when you ' +
    'need the names (and use_file to claim one).',
  inputSchema: z.object({}),
  kind: 'read',
};
