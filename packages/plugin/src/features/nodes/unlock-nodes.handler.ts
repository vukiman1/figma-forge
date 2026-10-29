import { UNLOCK_NODES_TOOL_NAME as TOOL, unlockNodesParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { setLocked } from './set-locked.js';

export const createUnlockNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw =>
    setLocked(figmaCtx, parseParams(TOOL, unlockNodesParams, raw).nodeIds, false);
