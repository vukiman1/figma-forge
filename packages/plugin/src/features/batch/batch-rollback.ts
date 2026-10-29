import { errorMessage } from '../error-message.js';
import { opLabel, type ParsedOp } from './batch-ops.js';
import { type FlowsSnapshot, restoreFlows } from './flows-snapshot.js';
import { type OpCapture, undoOp } from './op-lifecycle.js';

export interface AppliedOp {
  readonly capture: OpCapture;
  readonly result: unknown;
}

interface Unwound {
  readonly failures: readonly string[];
  readonly residue: readonly string[];
}

type UndoOutcome = { readonly residue: string } | { readonly failure: string } | null;

const undoOutcome = async (
  figmaCtx: typeof figma,
  { capture, result }: AppliedOp,
): Promise<UndoOutcome> => {
  const label = opLabel(capture.op);
  try {
    const note = await undoOp(figmaCtx, capture, result);
    return note === undefined ? null : { residue: `${label}: ${note}` };
  } catch (error) {
    return { failure: `${label}: ${errorMessage(error)}` };
  }
};

const unwind = async (figmaCtx: typeof figma, applied: readonly AppliedOp[]): Promise<Unwound> => {
  const outcomes: UndoOutcome[] = [];
  for (const op of applied.toReversed()) {
    // oxlint-disable-next-line no-await-in-loop -- undo runs in reverse apply order
    outcomes.push(await undoOutcome(figmaCtx, op));
  }
  return {
    failures: outcomes.flatMap(outcome =>
      outcome !== null && 'failure' in outcome ? [outcome.failure] : [],
    ),
    residue: outcomes.flatMap(outcome =>
      outcome !== null && 'residue' in outcome ? [outcome.residue] : [],
    ),
  };
};

const rollbackSummary = (appliedCount: number, failures: readonly string[]): string =>
  failures.length === 0
    ? `rolled back ${appliedCount} applied op(s)`
    : `rolled back ${appliedCount - failures.length}/${appliedCount} op(s); ${failures.length} undo(s) FAILED [${failures.join('; ')}] — document may be partially changed`;

export const rollBack = async (
  figmaCtx: typeof figma,
  failed: ParsedOp,
  applied: readonly AppliedOp[],
  flowsBefore: FlowsSnapshot,
  error: unknown,
): Promise<Error> => {
  const { failures, residue } = await unwind(figmaCtx, applied);
  const flowNotes = restoreFlows(figmaCtx, flowsBefore).map(note => `flows: ${note}`);
  const leftovers = [...residue, ...flowNotes];
  const leftover =
    leftovers.length === 0 ? '' : ` (restored with residue: ${leftovers.join('; ')})`;
  return new Error(
    `batch: ${opLabel(failed)} failed, ${rollbackSummary(applied.length, failures)}${leftover}: ${errorMessage(error)}`,
    { cause: error },
  );
};
