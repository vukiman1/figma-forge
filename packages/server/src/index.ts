import './process/process-guard-install.js';
import { PROTOCOL_VERSION } from '@figma-forge/core';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { errorMessage } from './common/error-message.js';
import { createMcpServer } from './mcp/mcp-server.js';
import { SelfReportingStdioTransport } from './mcp/self-reporting-stdio-transport.js';
import { wireShutdown } from './process/lifecycle.js';
import { log, SERVER_PORT, SERVER_VERSION } from './process/server-config.js';
import { createServerRuntime } from './process/server-runtime.js';

const runtime = await createServerRuntime();

let triggerShutdown = (): void => {};
const stdio = serveStdio(() => createMcpServer(runtime), {
  transport: new SelfReportingStdioTransport(() => {
    triggerShutdown();
  }),
  onerror: (error: Error): void => {
    log(`[figma-forge] stdio transport error: ${error.message}`);
  },
});

const roleDetail = runtime.node.isLeader()
  ? `relay on :${runtime.node.getLeader()?.port ?? SERVER_PORT}`
  : runtime.node.isConflicted()
    ? `:${SERVER_PORT} held by an unresponsive owner — contending for it`
    : `follower → ${runtime.node.leaderUrl}`;

log(
  `[figma-forge] server ${SERVER_VERSION} (protocol ${PROTOCOL_VERSION}) ready as ` +
    `${runtime.node.role}, ${roleDetail}`,
);

const shutdown = async (): Promise<void> => {
  try {
    await stdio.close();
  } catch (error: unknown) {
    log(`[figma-forge] failed to close stdio transport: ${errorMessage(error)}`);
  }
  runtime.election.stop();
  await runtime.node.stop();
  process.exit(0);
};

triggerShutdown = wireShutdown({
  proc: process,
  stdin: process.stdin,
  shutdown,
  hardExit: () => {
    log('[figma-forge] graceful shutdown stalled — forcing exit');
    process.exit(1);
  },
});
