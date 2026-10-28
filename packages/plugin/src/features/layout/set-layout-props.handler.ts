import {
  type MutateResult,
  pickDefined,
  SET_LAYOUT_PROPS_TOOL_NAME as TOOL,
  setLayoutPropsParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';

const CHILD_FIELDS = ['layoutAlign', 'layoutGrow', 'layoutPositioning'] as const;

const SIZING_FIELDS = ['layoutSizingHorizontal', 'layoutSizingVertical'] as const;

const BOUND_FIELDS = ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const;

const SIZING_HINT = 'HUG needs an auto-layout frame or text node, FILL needs an auto-layout parent';

const BOUND_HINT = 'min/max bounds apply to auto-layout frames and their direct children';

const setOrExplain = (
  node: BaseNode,
  field: string,
  value: string | number | null,
  hint: string,
): void => {
  if (!(field in node)) throw new Error(`${TOOL}: node ${node.id} does not support ${field}`);
  try {
    Reflect.set(node, field, value);
  } catch (error) {
    const shown = value === null ? 'null' : String(value);
    throw new Error(`${TOOL}: cannot set ${field}=${shown} on node ${node.id} — ${hint}`, {
      cause: error,
    });
  }
};

export const createSetLayoutPropsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, setLayoutPropsParams, raw);
    const node = await requireNode(figmaCtx, TOOL, params.nodeId);
    if (params.clipsContent !== undefined && !('clipsContent' in node)) {
      throw new Error(`${TOOL}: node ${node.id} does not support clipsContent`);
    }
    if (!('layoutAlign' in node)) {
      throw new Error(`${TOOL}: node ${node.id} has no auto-layout child properties`);
    }
    Object.assign(node, pickDefined(params, CHILD_FIELDS));
    for (const [field, value] of Object.entries(pickDefined(params, SIZING_FIELDS))) {
      setOrExplain(node, field, value, SIZING_HINT);
    }
    for (const field of BOUND_FIELDS) {
      const value = params[field];
      if (value !== undefined) setOrExplain(node, field, value, BOUND_HINT);
    }
    if (params.clipsContent !== undefined) Reflect.set(node, 'clipsContent', params.clipsContent);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
