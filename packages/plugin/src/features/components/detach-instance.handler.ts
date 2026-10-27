import {
  type CreateResult,
  DETACH_INSTANCE_TOOL_NAME as TOOL,
  detachInstanceParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireInstance } from './resolve-component.js';

export const createDetachInstanceHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { instanceId } = parseParams(TOOL, detachInstanceParams, raw);
    const frame = (await requireInstance(figmaCtx, TOOL, instanceId)).detachInstance();
    const result: CreateResult = { ok: true, nodeId: frame.id, name: frame.name, type: frame.type };
    return result;
  };
