import type { ToolSpec } from '@figma-forge/core';
import { normalizeIdArgs } from '@figma-forge/core';
import { McpServer } from '@modelcontextprotocol/server';

import { createGenericToolHandler } from './generic-tool-handler.js';
import { SERVER_INSTRUCTIONS } from './instructions.js';
import { PROMPTS } from './prompts/registry.js';
import { SERVER_NAME, SERVER_VERSION } from './server-config.js';
import type { ServerRuntime } from './server-runtime.js';
import { createSpecialToolHandlers } from './special-tool-handlers.js';
import { createToolDispatchers } from './tool-dispatchers.js';
import type { ToolHandler } from './tool-handler.js';
import { ALL_TOOL_SPECS } from './tools/registry/registry.js';
import { annotationsFor } from './tools/result/annotations.js';
import { captureNotices, withRoutingNotice, withSkewNotice } from './tools/result/notices.js';
import { assertWithinLimit } from './tools/result/result-budget.js';

const wrapToolHandler =
  (spec: ToolSpec, run: ToolHandler): ToolHandler =>
  async args =>
    assertWithinLimit(
      spec.name,
      await captureNotices(
        () => run(normalizeIdArgs(args)),
        (result, notices) =>
          withSkewNotice(withRoutingNotice(result, notices.routing), notices.skew),
      ),
    );

const registerTools = (server: McpServer, runtime: ServerRuntime): void => {
  const dispatchers = createToolDispatchers(runtime);
  const specialHandlers = createSpecialToolHandlers(runtime, dispatchers);
  for (const spec of ALL_TOOL_SPECS) {
    const run = specialHandlers[spec.name] ?? createGenericToolHandler(spec, dispatchers.dispatch);
    server.registerTool(
      spec.name,
      {
        description: spec.description,
        inputSchema: spec.inputSchema,
        annotations: annotationsFor(spec),
      },
      wrapToolHandler(spec, run),
    );
  }
};

const registerPrompts = (server: McpServer): void => {
  for (const prompt of PROMPTS) {
    server.registerPrompt(
      prompt.definition.name,
      {
        description: prompt.definition.description ?? '',
        argsSchema: prompt.argsSchema,
      },
      args => prompt.build(args),
    );
  }
};

export const createMcpServer = (runtime: ServerRuntime): McpServer => {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );
  registerTools(server, runtime);
  registerPrompts(server);
  return server;
};
