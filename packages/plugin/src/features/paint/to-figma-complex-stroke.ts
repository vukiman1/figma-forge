import {
  type ComplexStrokeInput,
  pickDefined,
  SCATTER_BRUSHES,
  STRETCH_BRUSHES,
  type VariableWidthInput,
} from '@figma-forge/core';

const FIELDS_BY_KIND = {
  BASIC: [],
  STRETCH: ['direction'],
  SCATTER: ['gap', 'wiggle', 'sizeJitter', 'angularJitter', 'rotation'],
  DYNAMIC: ['frequency', 'wiggle', 'smoothen'],
} as const satisfies Record<string, readonly (keyof ComplexStrokeInput)[]>;

type StrokeKind = keyof typeof FIELDS_BY_KIND;

const SHAPE_FIELDS = ['type', 'brushType', 'brushName'] as const;

const BRUSHES: Record<'STRETCH' | 'SCATTER', readonly string[]> = {
  STRETCH: STRETCH_BRUSHES,
  SCATTER: SCATTER_BRUSHES,
};

const kindOf = (stroke: ComplexStrokeInput): StrokeKind | undefined =>
  stroke.type === 'BRUSH' ? stroke.brushType : stroke.type;

const assertBrushName = (stroke: ComplexStrokeInput, kind: StrokeKind, tool: string): void => {
  if (kind !== 'STRETCH' && kind !== 'SCATTER') return;
  const names = BRUSHES[kind];
  if (stroke.brushName !== undefined && names.includes(stroke.brushName)) return;
  throw new TypeError(`${tool}: a ${kind} brush needs a brushName from ${names.join(', ')}`);
};

const assertOwnFields = (stroke: ComplexStrokeInput, kind: StrokeKind, tool: string): void => {
  const allowed: ReadonlySet<string> = new Set([...SHAPE_FIELDS, ...FIELDS_BY_KIND[kind]]);
  const extra = Object.entries(stroke)
    .filter(([key, value]) => value !== undefined && !allowed.has(key))
    .map(([key]) => key);
  if (extra.length === 0) return;
  const takes = FIELDS_BY_KIND[kind];
  throw new TypeError(
    `${tool}: ${extra.join(', ')} ${extra.length === 1 ? 'does' : 'do'} not apply to a ${kind} ` +
      `stroke${takes.length > 0 ? ` (it takes ${takes.join(', ')})` : ''}`,
  );
};

export const toFigmaComplexStroke = (
  stroke: ComplexStrokeInput,
  tool: string,
): ComplexStrokeProperties => {
  const kind = kindOf(stroke);
  if (kind === undefined) {
    throw new TypeError(
      `${tool}: complexStrokeProperties needs type BASIC, DYNAMIC, or BRUSH with brushType ` +
        'STRETCH or SCATTER',
    );
  }
  assertBrushName(stroke, kind, tool);
  assertOwnFields(stroke, kind, tool);
  const properties = pickDefined(stroke, [...SHAPE_FIELDS, ...FIELDS_BY_KIND[kind]]);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Figma fills in the omitted brush and dynamic settings, though its typings require every one
  return properties as ComplexStrokeProperties;
};

export const toFigmaVariableWidth = (
  width: VariableWidthInput,
  tool: string,
): VariableWidthStrokeProperties => {
  if (width.widthProfile !== 'CUSTOM') return { widthProfile: width.widthProfile };
  if (width.variableWidthPoints === undefined) {
    throw new TypeError(`${tool}: a CUSTOM width profile needs variableWidthPoints`);
  }
  return { widthProfile: 'CUSTOM', variableWidthPoints: width.variableWidthPoints };
};
