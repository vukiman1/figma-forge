import type { SerializedNode } from '@figma-forge/core';

import { serializeComplexStroke, serializeVariableWidthStroke } from '../draw-strokes.js';
import { fieldOf, stringFieldOf } from '../field-of.js';
import { type PaintOwnerSize, serializePaint } from '../paint.js';
import { isPaintList } from './figma-lists.js';
import { writeStrokeWeight } from './stroke-weight.js';

const DEFAULT_STROKE_CAP = 'NONE';
const DEFAULT_STROKE_JOIN = 'MITER';

const isNumberList = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(item => typeof item === 'number');

const writeDashPattern = (node: SceneNode, out: SerializedNode): void => {
  const dash = fieldOf(node, 'dashPattern');
  if (isNumberList(dash) && dash.length > 0) out.dashPattern = dash;
};

const writeStrokeShape = (node: SceneNode, out: SerializedNode): void => {
  const complex = serializeComplexStroke(fieldOf(node, 'complexStrokeProperties'));
  const widths = serializeVariableWidthStroke(fieldOf(node, 'variableWidthStrokeProperties'));
  const isDrawStroke = complex !== undefined || widths !== undefined;
  if (!isDrawStroke) writeDashPattern(node, out);
  const cap = stringFieldOf(node, 'strokeCap');
  if (cap !== undefined && cap !== DEFAULT_STROKE_CAP) out.strokeCap = cap;
  const join = stringFieldOf(node, 'strokeJoin');
  if (join !== undefined && join !== DEFAULT_STROKE_JOIN) out.strokeJoin = join;
  if (complex !== undefined) out.complexStrokeProperties = complex;
  if (widths !== undefined) out.variableWidthStrokeProperties = widths;
};

export const writeStrokeFields = (
  node: SceneNode,
  out: SerializedNode,
  ownerSize: PaintOwnerSize | null,
): void => {
  const strokes = fieldOf(node, 'strokes');
  if (!isPaintList(strokes) || strokes.length === 0) return;
  out.strokes = strokes.map(paint => serializePaint(paint, ownerSize));
  writeStrokeWeight(node, out);
  const align = stringFieldOf(node, 'strokeAlign');
  if (align !== undefined) out.strokeAlign = align;
  writeStrokeShape(node, out);
};
