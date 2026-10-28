import { createIdempotencyCache, idempotent } from '../runtime/idempotency.js';
import { withInstanceIdLookup } from '../runtime/node-lookup.js';
import type { SandboxHandlers } from '../runtime/sandbox-handler.js';
import { createBatchHandler } from './batch/batch.handler.js';
import type { HandlerFactories } from './handler-factories.js';
import { READ_HANDLERS, WRITE_HANDLERS } from './tool-handlers.js';

const instantiate = (factories: HandlerFactories, figmaCtx: typeof figma): SandboxHandlers =>
  Object.fromEntries(Object.entries(factories).map(([name, create]) => [name, create(figmaCtx)]));

export const createSandboxHandlers = (figmaApi: typeof figma): SandboxHandlers => {
  const figmaCtx = withInstanceIdLookup(figmaApi);
  const cache = createIdempotencyCache();
  const rawWrites = instantiate(WRITE_HANDLERS, figmaCtx);
  const writes = Object.fromEntries(
    Object.entries(rawWrites).map(([name, handler]) => [name, idempotent(cache, handler)]),
  );
  return {
    ...instantiate(READ_HANDLERS, figmaCtx),
    ...writes,
    batch: idempotent(cache, createBatchHandler(figmaCtx, rawWrites)),
  };
};
