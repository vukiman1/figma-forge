import {
  resolveVariables,
  type VariableTable,
  variableFor,
} from '../variables/resolve-variables.js';
import { loadFontIfAvailable } from './fonts.js';

export type TextStyleBindings = Record<string, string | null>;

const FIELD_ORDER: Readonly<Record<string, number>> = {
  fontFamily: 0,
  fontStyle: 1,
  fontWeight: 2,
};

const UNORDERED = 3;

const rankOf = (field: string): number => FIELD_ORDER[field] ?? UNORDERED;

const stringValues = (variable: Variable): string[] => [
  ...new Set(Object.values(variable.valuesByMode).filter(value => typeof value === 'string')),
];

const valuesOrCurrent = (table: VariableTable, id: string | null | undefined, current: string) =>
  typeof id === 'string' ? stringValues(variableFor(table, id)) : [current];

export const resolveTextStyleBindings = async (
  figmaCtx: typeof figma,
  bindings: TextStyleBindings,
  where: string,
): Promise<VariableTable> =>
  resolveVariables(
    figmaCtx,
    Object.values(bindings).filter((id): id is string => typeof id === 'string'),
    where,
  );

const preloadBoundFaces = async (
  figmaCtx: typeof figma,
  current: FontName,
  bindings: TextStyleBindings,
  table: VariableTable,
): Promise<void> => {
  const families = valuesOrCurrent(table, bindings.fontFamily, current.family);
  const styles = [current.style, ...valuesOrCurrent(table, bindings.fontStyle, current.style)];
  const faces = new Map(
    families.flatMap(family => styles.map(style => [`${family}\u0000${style}`, { family, style }])),
  );
  await Promise.all([...faces.values()].map(async face => loadFontIfAvailable(figmaCtx, face)));
};

export const applyTextStyleBindings = async (
  figmaCtx: typeof figma,
  style: TextStyle,
  bindings: TextStyleBindings,
  table: VariableTable,
): Promise<void> => {
  await preloadBoundFaces(figmaCtx, style.fontName, bindings, table);
  const ordered = Object.entries(bindings).toSorted(([a], [b]) => rankOf(a) - rankOf(b));
  for (const [field, id] of ordered) {
    style.setBoundVariable(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Figma validates the field name and rejects unknown ones
      field as VariableBindableTextField,
      id === null ? null : variableFor(table, id),
    );
  }
};
