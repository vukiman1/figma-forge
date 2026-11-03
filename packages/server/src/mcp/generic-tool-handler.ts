import { BATCH_TOOL_NAME, newId, type ToolSpec } from '@figma-forge/core';

import type { ToolDispatch } from '../dispatch/tool-dispatchers.js';
import {
  IMAGE_PATH_TOOLS,
  importImageError,
  resolveBatchImagePaths,
  resolveImagePath,
} from '../tools/nodes/import-image.handler.js';
import { checkBatchOps } from '../tools/wire/wire-schema.js';
import { textResult, type ToolHandler } from './tool-handler.js';

const validateBatch = (spec: ToolSpec, args: Record<string, unknown>): void => {
  if (spec.name !== BATCH_TOOL_NAME) return;
  const rejection = checkBatchOps(args);
  if (rejection !== null) throw new Error(rejection.message);
};

const resolveServerArgs = async (
  spec: ToolSpec,
  rawArgs: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  if (IMAGE_PATH_TOOLS.has(spec.name)) return resolveImagePath(rawArgs, spec.name);
  if (spec.name === BATCH_TOOL_NAME) return resolveBatchImagePaths(rawArgs);
  return rawArgs;
};

const dispatchImageTool = async (
  dispatch: ToolDispatch,
  spec: ToolSpec,
  rawArgs: Record<string, unknown>,
  dispatchArgs: Record<string, unknown>,
): ReturnType<ToolHandler> => {
  try {
    return textResult(await dispatch(spec.name, dispatchArgs));
  } catch (error: unknown) {
    throw importImageError(error, rawArgs.path, spec.name);
  }
};

export const createGenericToolHandler =
  (spec: ToolSpec, dispatch: ToolDispatch): ToolHandler =>
  async rawArgs => {
    validateBatch(spec, rawArgs);
    const args = await resolveServerArgs(spec, rawArgs);
    const dispatchArgs = spec.kind === 'write' ? { ...args, requestId: newId() } : args;
    if (IMAGE_PATH_TOOLS.has(spec.name)) {
      return dispatchImageTool(dispatch, spec, rawArgs, dispatchArgs);
    }
    return textResult(await dispatch(spec.name, dispatchArgs));
  };
