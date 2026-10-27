import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const USE_FILE_TOOL_NAME = 'use_file';

export const useFileTool: ToolSpec = {
  name: USE_FILE_TOOL_NAME,
  description:
    'Claim one open Figma file for this agent, so its tool calls stop following whichever file the ' +
    'user last touched. Call this when list_files or ping shows more than one file connected — ' +
    'without it two agents working on two files both track the foreground tab, and the one that ' +
    'is not in front silently reads and writes the wrong file. Pass fileName (refused when two ' +
    'open files share it) or sessionId (always unambiguous; take it from list_files). ' +
    'release: true drops the claim and goes back to following the foreground file. The claim lasts ' +
    'for this server process only, so it never affects another agent, and it survives the user ' +
    'closing and reopening the plugin panel (the file is re-found by name). Returns the claim plus ' +
    'the same file list as list_files.',
  inputSchema: z.object({
    fileName: z
      .string()
      .optional()
      .describe('Name of the open file to claim; refused if two open files share it'),
    sessionId: z
      .string()
      .optional()
      .describe('Exact plugin session to claim, from list_files — never ambiguous'),
    release: z
      .boolean()
      .optional()
      .describe('Drop the claim and go back to following the foreground file'),
  }),
  kind: 'local',
  serverOnlyArgs: null,
};
