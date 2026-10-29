import { CREATE_FRAME_TOOL_NAME as TOOL, createFrameParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { applyInitialProps, type InitialProps } from './initial-props.js';
import { createdResult, isSized, setNameAndPosition } from './new-node.js';
import { placeNode } from './place-node.js';

const FIXED_SIZING = { layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'FIXED' } as const;

const keepingExplicitSize = (props: InitialProps, sized: boolean): InitialProps =>
  sized && props.autoLayout !== undefined ? { ...FIXED_SIZING, ...props } : props;

export const createCreateFrameHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, createFrameParams, raw);
    const frame = figmaCtx.createFrame();
    const sized = isSized(params);
    if (sized) frame.resize(params.width, params.height);
    setNameAndPosition(frame, params);
    await placeNode(figmaCtx, frame, params.parentId, TOOL);
    await applyInitialProps(figmaCtx, frame, keepingExplicitSize(params, sized), TOOL);
    return createdResult(frame);
  };
