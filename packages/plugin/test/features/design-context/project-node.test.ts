import { SerializedNodeSchema, SerializedTextSegmentSchema } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { project } from '../../../src/features/design-context/project-node.js';

const DROPPED = new Map<string, string>([
  ['locked', 'editor lock state — irrelevant to generated code'],
  ['parentId', 'structural; the projected tree shape already encodes parentage'],
]);

const HANDLED_ELSEWHERE = new Map<string, string>([
  ['mainComponent', 'resolved async per INSTANCE in buildNode'],
  ['children', 'recursed per node in buildNode'],
  [
    'explicitVariableModes',
    'carried as variableModes; resolveVariableModes names it and adds the modes a root inherits',
  ],
]);

const RENAMED = new Map<string, string>([
  ['variableModes', 'explicitVariableModes — named per collection/mode for the design context'],
]);

const SOLID = { type: 'SOLID', color: { r: 1, g: 0, b: 0 } };

const base = (over: Record<string, unknown>): SceneNode =>
  ({
    id: 'x',
    name: 'x',
    type: 'FRAME',
    visible: true,
    locked: false,
    x: 1,
    y: 2,
    width: 10,
    height: 20,
    parent: null,
    ...over,
  }) as unknown as SceneNode;

const frameInGrid = base({
  id: 'a',
  visible: false,
  parent: { id: 'gp', layoutMode: 'GRID' },
  rotation: 45,
  relativeTransform: [
    [Math.SQRT1_2, -Math.SQRT1_2, 0],
    [-Math.SQRT1_2, -Math.SQRT1_2, 0],
  ],
  opacity: 0.5,
  cornerRadius: Symbol('mixed'),
  cornerSmoothing: 0.6,
  topLeftRadius: 8,
  topRightRadius: 0,
  bottomRightRadius: 4,
  bottomLeftRadius: 0,
  blendMode: 'MULTIPLY',
  isMask: true,
  maskType: 'LUMINANCE',
  fills: [SOLID],
  strokes: [SOLID],
  strokeWeight: Symbol('mixed'),
  strokeTopWeight: 1,
  strokeRightWeight: 0,
  strokeBottomWeight: 2,
  strokeLeftWeight: 0,
  strokeAlign: 'CENTER',
  dashPattern: [4, 2],
  strokeCap: 'ROUND',
  strokeJoin: 'BEVEL',
  effects: [
    {
      type: 'DROP_SHADOW',
      visible: true,
      radius: 4,
      color: { r: 0, g: 0, b: 0, a: 0.5 },
      offset: { x: 0, y: 2 },
      spread: 1,
    },
  ],
  layoutMode: 'HORIZONTAL',
  paddingTop: 1,
  paddingRight: 2,
  paddingBottom: 3,
  paddingLeft: 4,
  itemSpacing: 8,
  primaryAxisAlignItems: 'CENTER',
  counterAxisAlignItems: 'MIN',
  layoutWrap: 'WRAP',
  counterAxisSpacing: 12,
  counterAxisAlignContent: 'SPACE_BETWEEN',
  layoutSizingHorizontal: 'FILL',
  layoutSizingVertical: 'HUG',
  layoutGrow: 1,
  layoutAlign: 'STRETCH',
  layoutPositioning: 'ABSOLUTE',
  minWidth: 100,
  maxWidth: 400,
  minHeight: 40,
  maxHeight: 200,
  gridRowAnchorIndex: 1,
  gridColumnAnchorIndex: 2,
  gridRowSpan: 2,
  gridColumnSpan: 3,
  gridChildHorizontalAlign: 'CENTER',
  gridChildVerticalAlign: 'MAX',
  clipsContent: true,
  layoutGrids: [
    { pattern: 'COLUMNS', visible: true, count: 12, gutterSize: 16, alignment: 'MIN', offset: 24 },
  ],
  overflowDirection: 'VERTICAL',
  numberOfFixedChildren: 2,
  targetAspectRatio: { x: 16, y: 9 },
  annotations: [
    {
      label: 'Use brand colour',
      labelMarkdown: '**brand**',
      categoryId: 'c1',
      properties: [{ type: 'fills' }],
    },
  ],
  fillStyleId: 'S:fill',
  strokeStyleId: 'S:stroke',
  effectStyleId: 'S:effect',
  boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'V:1' }] },
  explicitVariableModes: { 'VariableCollectionId:1:2': '1:1' },
  componentProperties: { Size: { type: 'VARIANT', value: 'lg' } },
});

const arcWithConstraints = base({
  id: 'b',
  type: 'ELLIPSE',
  arcData: { startingAngle: 0, endingAngle: Math.PI, innerRadius: 0.5 },
  constraints: { horizontal: 'MAX', vertical: 'CENTER' },
});

const fullSegment = {
  characters: 'Link',
  start: 0,
  end: 4,
  fontName: { family: 'Inter', style: 'Bold' },
  fontSize: 16,
  fills: [SOLID],
  textDecoration: 'UNDERLINE',
  textCase: 'UPPER',
  lineHeight: { value: 20, unit: 'PIXELS' },
  letterSpacing: { value: 0.5, unit: 'PIXELS' },
  hyperlink: { type: 'URL', value: 'https://example.com' },
  listOptions: { type: 'ORDERED' },
  indentation: 2,
  textWrapStyle: 'PRETTY',
  textStyleId: 'S:seg-text',
  fillStyleId: 'S:seg-fill',
  boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'V:2' }] },
};

const richText = base({
  id: 'c',
  type: 'TEXT',
  characters: 'Link text',
  componentPropertyReferences: { characters: 'Caption#79:0' },
  fontSize: Symbol('mixed'),
  fontName: { family: 'Inter', style: 'Bold' },
  textAlignHorizontal: 'CENTER',
  textAlignVertical: 'BOTTOM',
  lineHeight: { value: 24, unit: 'PIXELS' },
  letterSpacing: { value: 2, unit: 'PERCENT' },
  textCase: 'UPPER',
  textDecoration: 'UNDERLINE',
  textAutoResize: 'HEIGHT',
  textTruncation: 'ENDING',
  maxLines: 2,
  paragraphSpacing: 8,
  paragraphIndent: 4,
  textWrapStyle: 'BALANCE',
  hyperlink: { type: 'URL', value: 'https://example.com' },
  textStyleId: 'S:text',
  getStyledTextSegments: () => [fullSegment],
});

const drawnStroke = base({
  id: 'd',
  type: 'VECTOR',
  strokes: [SOLID],
  strokeWeight: 6,
  complexStrokeProperties: { type: 'DYNAMIC', frequency: 5, wiggle: 4, smoothen: 0.5 },
  variableWidthStrokeProperties: {
    widthProfile: 'TAPER',
    variableWidthPoints: [
      { position: 0, width: 0.5 },
      { position: 1, width: 0.1875 },
    ],
  },
  absoluteBoundingBox: { x: 1, y: 2, width: 10, height: 20 },
  absoluteRenderBounds: { x: -1, y: -3, width: 14, height: 30 },
});

const repeatGroup = base({
  id: 'e',
  type: 'TRANSFORM_GROUP',
  transformModifiers: [
    {
      type: 'REPEAT',
      repeatType: 'LINEAR',
      axis: 'HORIZONTAL',
      unitType: 'PIXELS',
      offset: 12,
      count: 3,
    },
  ],
  absoluteTransform: [
    [1, 0, 1],
    [0, 1, 2],
  ],
  children: [
    {
      width: 10,
      height: 20,
      absoluteTransform: [
        [1, 0, 1],
        [0, 1, 2],
      ],
    },
  ],
});

const textOnPath = base({
  id: 'f',
  type: 'TEXT_PATH',
  characters: 'Round and round',
  fontSize: 14,
  fontName: { family: 'Inter', style: 'Regular' },
  letterSpacing: { value: 0, unit: 'PERCENT' },
  textCase: 'ORIGINAL',
  textAlignHorizontal: 'CENTER',
  textAlignVertical: 'TOP',
  hyperlink: null,
  textPathStartData: { segment: 1, position: 0.5 },
});

const FIXTURES = [frameInGrid, arcWithConstraints, richText, drawnStroke, repeatGroup, textOnPath];

const schemaKeys = Object.keys(SerializedNodeSchema.shape);
const segmentSchemaKeys = Object.keys(SerializedTextSegmentSchema.shape);

const projected = FIXTURES.map(n => project(n, 'full'));
const projectedKeys = new Set(projected.flatMap(p => Object.keys(p)));
const projectedSegmentKeys = new Set(
  projected.flatMap(p => (p.segments ?? []).flatMap(s => Object.keys(s))),
);

describe('get_design_context projection coverage (full detail)', () => {
  it('projects every serialized node dimension, or allowlists it with a reason', () => {
    const missing = schemaKeys.filter(
      k => !DROPPED.has(k) && !HANDLED_ELSEWHERE.has(k) && !projectedKeys.has(k),
    );
    expect(missing).toEqual([]);
  });

  it('projects every serialized text-segment dimension', () => {
    const missing = segmentSchemaKeys.filter(k => !projectedSegmentKeys.has(k));
    expect(missing).toEqual([]);
  });

  it('never emits a field the serialized schema does not define (typo guard)', () => {
    const unknown = [...projectedKeys].filter(k => !schemaKeys.includes(k) && !RENAMED.has(k));
    const unknownSeg = [...projectedSegmentKeys].filter(k => !segmentSchemaKeys.includes(k));
    expect({ unknown, unknownSeg }).toEqual({ unknown: [], unknownSeg: [] });
  });

  it('keeps the allowlists honest: real schema keys that truly do not project', () => {
    const allowlisted = [...DROPPED.keys(), ...HANDLED_ELSEWHERE.keys()];
    const notInSchema = allowlisted.filter(k => !schemaKeys.includes(k));
    const actuallyProjected = allowlisted.filter(k => projectedKeys.has(k));
    expect({ notInSchema, actuallyProjected }).toEqual({
      notInSchema: [],
      actuallyProjected: [],
    });
  });
});
