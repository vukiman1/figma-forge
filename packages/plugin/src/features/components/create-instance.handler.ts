import {
  CREATE_INSTANCE_TOOL_NAME as TOOL,
  type CreateResult,
  createInstanceParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { placeNode } from '../nodes/place-node.js';
import { parseParams } from '../parse-params.js';
import { resolveComponent } from './resolve-component.js';

export const createCreateInstanceHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { parentId, name, x, y, ...source } = parseParams(TOOL, createInstanceParams, raw);
    const instance = (await resolveComponent(figmaCtx, TOOL, source)).createInstance();
    if (name !== undefined) instance.name = name;
    if (x !== undefined) instance.x = x;
    if (y !== undefined) instance.y = y;
    await placeNode(figmaCtx, instance, parentId, TOOL);
    const result: CreateResult = {
      ok: true,
      nodeId: instance.id,
      name: instance.name,
      type: instance.type,
    };
    return result;
  };
