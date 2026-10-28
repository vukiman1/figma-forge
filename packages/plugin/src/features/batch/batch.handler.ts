import type { BatchResult } from '@figma-forge/core';

import type { SandboxHandlers, SandboxToolHandler } from '../../dispatcher.js';
import { errorMessage } from '../error-message.js';
import { type ParsedOp, parseOps } from './batch-ops.js';
import { type AppliedOp, rollBack } from './batch-rollback.js';
import { refuseEmptiedContainers } from './emptied-containers.js';
import { captureFlows } from './flows-snapshot.js';
import { INVERSES } from './inverses.js';
import { captureOp, type OpCapture } from './op-lifecycle.js';

const requireHandlers = (ops: readonly ParsedOp[], apply: SandboxHandlers): void => {
  const missing = ops.find(op => apply[op.tool] === undefined);
  if (missing !== undefined) throw new Error(`batch: no handler for op '${missing.tool}'`);
};

const captureAll = async (
  figmaCtx: typeof figma,
  ops: readonly ParsedOp[],
): Promise<OpCapture[]> => {
  try {
    return await Promise.all(ops.map(async op => captureOp(figmaCtx, op)));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(`batch: capture failed before any op was applied: ${errorMessage(error)}`, {
      cause: error,
    });
  }
};

export const createBatchHandler =
  (figmaCtx: typeof figma, apply: SandboxHandlers): SandboxToolHandler =>
  async raw => {
    const ops = parseOps(raw, INVERSES);
    requireHandlers(ops, apply);
    await refuseEmptiedContainers(figmaCtx, ops);
    const captures = await captureAll(figmaCtx, ops);
    const flowsBefore = captureFlows(figmaCtx);
    const applied: AppliedOp[] = [];
    for (const capture of captures) {
      const handler = apply[capture.op.tool];
      try {
        // oxlint-disable-next-line no-await-in-loop -- ops apply in order, and rollback needs each result
        const result: unknown = await handler?.(capture.op.params);
        applied.push({ capture, result });
      } catch (error) {
        // oxlint-disable-next-line no-await-in-loop -- the first failure ends the loop with its rollback
        throw await rollBack(figmaCtx, capture.op, applied, flowsBefore, error);
      }
    }
    const result: BatchResult = { ok: true, results: applied.map(({ result: value }) => value) };
    return result;
  };
