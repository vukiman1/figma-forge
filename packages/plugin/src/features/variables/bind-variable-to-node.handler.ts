import {
  BIND_VARIABLE_TO_NODE_TOOL_NAME as TOOL,
  bindVariableToNodeParams,
  type MutateResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';
import { findVariable } from './lookup.js';

const PAINT_FIELDS: ReadonlySet<string> = new Set(['fills', 'strokes']);

const canBindVariables = (node: BaseNode): node is SceneNode =>
  'setBoundVariable' in node && typeof node.setBoundVariable === 'function';

export const createBindVariableToNodeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, field, variableId } = parseParams(TOOL, bindVariableToNodeParams, raw);
    if (PAINT_FIELDS.has(field)) {
      throw new Error(
        `${TOOL}: "${field}" is a paint-level colour binding — use bind_variable_to_paint instead`,
      );
    }
    const node = await requireNode(figmaCtx, TOOL, nodeId);
    if (!canBindVariables(node)) throw new Error(`${TOOL}: node ${nodeId} cannot bind variables`);
    const variable = await findVariable(figmaCtx, TOOL, variableId);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Figma validates the field name and rejects unknown ones
    node.setBoundVariable(field as VariableBindableNodeField, variable);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
