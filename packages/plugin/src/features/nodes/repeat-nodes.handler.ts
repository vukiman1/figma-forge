import { REPEAT_NODES_TOOL_NAME as TOOL, repeatNodesParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { createdResult } from './new-node.js';
import { toFigmaModifier } from './repeat-modifier.js';
import { resolveSharedParent } from './shared-parent.js';

export const createRepeatNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, modifiers, name } = parseParams(TOOL, repeatNodesParams, raw);
    const { nodes, parent, index } = await resolveSharedParent(
      figmaCtx,
      [...new Set(nodeIds)],
      TOOL,
    );
    const group = figmaCtx.transformGroup(nodes, parent, index, modifiers.map(toFigmaModifier));
    if (name !== undefined) group.name = name;
    return createdResult(group);
  };
