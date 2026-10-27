import {
  type MutateResult,
  SWAP_COMPONENT_TOOL_NAME as TOOL,
  swapComponentParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireInstance, resolveComponent } from './resolve-component.js';

export const createSwapComponentHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { instanceId, ...source } = parseParams(TOOL, swapComponentParams, raw);
    if (source.componentId === undefined && source.componentKey === undefined) {
      throw new TypeError(`${TOOL}: provide componentId or componentKey`);
    }
    const instance = await requireInstance(figmaCtx, TOOL, instanceId);
    instance.swapComponent(await resolveComponent(figmaCtx, TOOL, source));
    const result: MutateResult = { ok: true, nodeId: instance.id };
    return result;
  };
