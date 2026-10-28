import { LOCK_NODES_TOOL_NAME as TOOL, lockNodesParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { setLocked } from './set-locked.js';

export const createLockNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw =>
    setLocked(figmaCtx, parseParams(TOOL, lockNodesParams, raw).nodeIds, true);
