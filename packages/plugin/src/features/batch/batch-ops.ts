import { BATCH_TOOL_NAME, batchParams } from '@figma-forge/core';

import { parseParams } from '../parse-params.js';
import type { BatchInverse } from './inverse.js';
import { NON_BATCHABLE } from './non-batchable.js';

export interface ParsedOp {
  readonly index: number;
  readonly tool: string;
  readonly params: unknown;
  readonly inverse: BatchInverse;
}

const NOT_A_WRITE = 'only write tools can be batched';

export const parseOps = (
  raw: unknown,
  inverses: Readonly<Record<string, BatchInverse>>,
): ParsedOp[] =>
  parseParams(BATCH_TOOL_NAME, batchParams, raw).ops.map(({ tool, params }, index) => {
    const inverse = inverses[tool];
    if (inverse === undefined) {
      const why = NON_BATCHABLE[tool] ?? NOT_A_WRITE;
      throw new Error(`batch: op '${tool}' (index ${index}) is not batchable — ${why}`);
    }
    return { index, tool, params: params ?? {}, inverse };
  });

export const opLabel = ({ index, tool }: Pick<ParsedOp, 'index' | 'tool'>): string =>
  `op ${index} (${tool})`;
