import type { BoundVariablesInput, FillPaintInput } from '@figma-forge/core';

import {
  boundIdsOf,
  resolveVariables,
  type VariableTable,
  variableFor,
} from '../variables/resolve-variables.js';
import { toFigmaPaint } from './to-figma-paint.js';

const alias = (id: string): VariableAlias => ({ type: 'VARIABLE_ALIAS', id });

const bindStop = (
  stop: ColorStop,
  bindings: BoundVariablesInput,
  table: VariableTable,
  where: string,
): ColorStop => {
  const aliases: Record<string, VariableAlias> = {};
  for (const [field, id] of Object.entries(bindings)) {
    const variable = variableFor(table, id);
    if (field === 'color' && variable.resolvedType !== 'COLOR') {
      throw new Error(
        `${where}: a gradient stop colour takes a COLOR variable; ${variable.name} is ${variable.resolvedType}`,
      );
    }
    aliases[field] = alias(id);
  }
  return { ...stop, boundVariables: aliases };
};

const bindSolid = (
  figmaCtx: typeof figma,
  paint: SolidPaint,
  bindings: BoundVariablesInput,
  table: VariableTable,
): SolidPaint =>
  Object.entries(bindings).reduce(
    (bound, [field, id]) =>
      figmaCtx.variables.setBoundVariableForPaint(
        bound,
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Figma validates the field name and rejects unknown ones
        field as VariableBindablePaintField,
        variableFor(table, id),
      ),
    paint,
  );

const bindGradient = (
  paint: GradientPaint,
  source: FillPaintInput,
  table: VariableTable,
  where: string,
): GradientPaint => ({
  ...paint,
  gradientStops: paint.gradientStops.map((stop, index) => {
    const bindings = source.gradientStops?.[index]?.boundVariables;
    return bindings === undefined ? stop : bindStop(stop, bindings, table, where);
  }),
});

const bindPaint = (
  figmaCtx: typeof figma,
  source: FillPaintInput,
  table: VariableTable,
  where: string,
): Paint => {
  const paint = toFigmaPaint(source, figmaCtx);
  if (paint.type === 'SOLID' && source.boundVariables !== undefined) {
    return bindSolid(figmaCtx, paint, source.boundVariables, table);
  }
  if ('gradientStops' in paint) return bindGradient(paint, source, table, where);
  return paint;
};

export const toFigmaPaintsBound = async (
  figmaCtx: typeof figma,
  paints: readonly FillPaintInput[],
  where: string,
): Promise<Paint[]> => {
  const stopIds = paints.flatMap(paint => boundIdsOf(paint.gradientStops ?? []));
  const table = await resolveVariables(figmaCtx, [...boundIdsOf(paints), ...stopIds], where);
  return paints.map(paint => bindPaint(figmaCtx, paint, table, where));
};
