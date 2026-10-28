import type { ParsedOp } from './batch-ops.js';
import type { CapturedOp } from './inverse.js';
import { joinNotes } from './live-node.js';
import { captureOverrideGuard, type InstanceGuard } from './overrides/capture-guard.js';
import { restoreOverrideGuard } from './overrides/restore-guard.js';
import {
  captureLayoutScope,
  type LayoutScope,
  restoreLayoutDrift,
} from './snapshot/layout-scope.js';

export interface OpCapture {
  readonly op: ParsedOp;
  readonly captured: CapturedOp;
  readonly guard: readonly InstanceGuard[];
  readonly layout: LayoutScope;
}

export const captureOp = async (figmaCtx: typeof figma, op: ParsedOp): Promise<OpCapture> => {
  const captured = await op.inverse.capture(figmaCtx, op.params);
  const [guard, layout] = await Promise.all([
    captured.touches.length > 0 ? captureOverrideGuard(figmaCtx, captured.touches) : [],
    captured.resizes.length > 0 ? captureLayoutScope(figmaCtx, captured.resizes) : [],
  ]);
  return { op, captured, guard, layout };
};

export const undoOp = async (
  figmaCtx: typeof figma,
  { captured, guard, layout }: OpCapture,
  result: unknown,
): Promise<string | undefined> => {
  const own = await captured.undo(result);
  const overrides = guard.length > 0 ? await restoreOverrideGuard(figmaCtx, guard) : undefined;
  await restoreLayoutDrift(figmaCtx, layout);
  return joinNotes([own, overrides]);
};
