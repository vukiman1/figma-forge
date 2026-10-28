import {
  CREATE_TEXT_PATH_TOOL_NAME as TOOL,
  type CreateResult,
  createTextPathParams,
} from '@figma-forge/core';
import type { z } from 'zod';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { toFigmaPaintsBound } from '../paint/bound-paints.js';
import { writePaints } from '../paint/write-paints.js';
import { parseParams } from '../parse-params.js';
import { loadFonts, toFigmaFontName } from './fonts.js';
import {
  createTextPathOn,
  isPathSource,
  type PathSource,
  segmentCountOf,
  segmentOutOfRange,
} from './path-segments.js';

type CreateTextPathParams = z.output<typeof createTextPathParams>;

type Container = BaseNode & ChildrenMixin;

const DEFAULT_FONT: FontName = { family: 'Inter', style: 'Regular' };

const SELF_DELETING_PARENTS: ReadonlySet<string> = new Set([
  'GROUP',
  'BOOLEAN_OPERATION',
  'TRANSFORM_GROUP',
]);

const requireSource = async (
  figmaCtx: typeof figma,
  nodeId: string,
): Promise<{ source: PathSource; container: Container }> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (!isPathSource(node)) {
    throw new Error(
      `${TOOL}: node ${nodeId} is ${node === null ? 'not found' : `a ${node.type}`} — text ` +
        'can follow a vector, a line or a shape (rectangle, ellipse, polygon, star)',
    );
  }
  const container = node.parent;
  if (container === null || !('insertChild' in container)) {
    throw new Error(`${TOOL}: node ${nodeId} has no parent to keep the text in`);
  }
  return { source: node, container };
};

const assertStartSegment = (figmaCtx: typeof figma, source: PathSource, segment = 0): void => {
  if (segment === 0) return;
  const count = segmentCountOf(figmaCtx, source);
  if (segment >= count) {
    throw segmentOutOfRange(TOOL, source.id, segment, count, 'start the text at segment 0');
  }
};

const createInPlace = (
  figmaCtx: typeof figma,
  source: PathSource,
  container: Container,
  params: CreateTextPathParams,
): TextPathNode => {
  const index = container.children.indexOf(source);
  const keepsGroupAlive =
    SELF_DELETING_PARENTS.has(container.type) && container.children.length === 1;
  const standIn = keepsGroupAlive ? figmaCtx.createRectangle() : null;
  if (standIn !== null) container.appendChild(standIn);
  const text = createTextPathOn(
    figmaCtx,
    source,
    params.startSegment ?? 0,
    params.startPosition ?? 0,
  );
  container.insertChild(index, text);
  standIn?.remove();
  return text;
};

const styleText = async (
  text: TextPathNode,
  params: CreateTextPathParams,
  fills: Paint[] | undefined,
): Promise<void> => {
  if (params.fontName !== undefined)
    Reflect.set(text, 'fontName', toFigmaFontName(params.fontName));
  if (params.fontSize !== undefined) text.fontSize = params.fontSize;
  text.characters = params.characters;
  if (fills !== undefined) await writePaints(text, 'fills', fills);
  if (params.textAlignHorizontal !== undefined)
    text.textAlignHorizontal = params.textAlignHorizontal;
  if (params.textAlignVertical !== undefined) text.textAlignVertical = params.textAlignVertical;
  if (params.name !== undefined) text.name = params.name;
};

export const createCreateTextPathHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, createTextPathParams, raw);
    const { source, container } = await requireSource(figmaCtx, params.nodeId);
    const font = params.fontName === undefined ? [] : [toFigmaFontName(params.fontName)];
    await loadFonts(figmaCtx, [DEFAULT_FONT, ...font]);
    const fills =
      params.fills === undefined
        ? undefined
        : await toFigmaPaintsBound(figmaCtx, params.fills, TOOL);
    assertStartSegment(figmaCtx, source, params.startSegment);
    const text = createInPlace(figmaCtx, source, container, params);
    await styleText(text, params, fills);
    const result: CreateResult = { ok: true, nodeId: text.id, name: text.name, type: text.type };
    return result;
  };
