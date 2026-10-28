import { CREATE_SHAPE_TOOL_NAME as TOOL, createShapeParams } from '@figma-forge/core';
import type { z } from 'zod';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { applyInitialProps } from './initial-props.js';
import { createdResult, setNameAndPosition } from './new-node.js';
import { placeNode } from './place-node.js';

type ShapeParams = z.output<typeof createShapeParams>;

const createLine = (figmaCtx: typeof figma, { width }: ShapeParams): LineNode => {
  const line = figmaCtx.createLine();
  if (width !== undefined) line.resize(width, 0);
  return line;
};

const createPointed = (figmaCtx: typeof figma, params: ShapeParams): PolygonNode | StarNode => {
  const node = params.shape === 'STAR' ? figmaCtx.createStar() : figmaCtx.createPolygon();
  if (params.pointCount !== undefined) node.pointCount = params.pointCount;
  if (node.type === 'STAR' && params.innerRadius !== undefined)
    node.innerRadius = params.innerRadius;
  const side = params.width ?? params.height;
  if (side !== undefined) node.resize(params.width ?? side, params.height ?? side);
  return node;
};

export const createCreateShapeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, createShapeParams, raw);
    const node =
      params.shape === 'LINE' ? createLine(figmaCtx, params) : createPointed(figmaCtx, params);
    setNameAndPosition(node, params);
    await placeNode(figmaCtx, node, params.parentId, TOOL);
    await applyInitialProps(figmaCtx, node, params, TOOL);
    return createdResult(node);
  };
