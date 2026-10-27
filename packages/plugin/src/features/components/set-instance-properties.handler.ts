import {
  type MutateResult,
  SET_INSTANCE_PROPERTIES_TOOL_NAME as TOOL,
  setInstancePropertiesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireInstance } from './resolve-component.js';

export const createSetInstancePropertiesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { instanceId, properties } = parseParams(TOOL, setInstancePropertiesParams, raw);
    if (Object.keys(properties).length === 0) {
      throw new Error(`${TOOL}: provide at least one property to set`);
    }
    const instance = await requireInstance(figmaCtx, TOOL, instanceId);
    instance.setProperties(properties);
    const result: MutateResult = { ok: true, nodeId: instance.id };
    return result;
  };
