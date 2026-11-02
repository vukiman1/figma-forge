import {
  type GetVariableDefsResult,
  type SerializedVariable,
  type SerializedVariableCollection,
  type SerializedVariableComposedColor,
  type SerializedVariableValue,
  toHex,
} from '@figma-forge/core';

import { formatEasing, isAlias, isComposedColor, isRgba, withAlpha } from './figma-token-value.js';
import type { FigmaToken, FigmaTokenValue } from './figma-token.js';

interface ModeContext {
  readonly modeId: string;
  readonly name: string;
}

const OPACITY_PERCENT_SCALE = 100;

const modeIn = (collection: SerializedVariableCollection, context: ModeContext | null): string => {
  if (context !== null) {
    if (collection.modes.some(mode => mode.modeId === context.modeId)) return context.modeId;
    const name = context.name.toLowerCase();
    const named = collection.modes.find(mode => mode.name.toLowerCase() === name);
    if (named !== undefined) return named.modeId;
  }
  return collection.defaultModeId;
};

export class FigmaVariableResolver {
  private readonly collections: ReadonlyMap<string, SerializedVariableCollection>;
  private readonly variables: ReadonlyMap<string, SerializedVariable>;

  constructor(defs: GetVariableDefsResult) {
    this.collections = new Map(defs.collections.map(collection => [collection.id, collection]));
    this.variables = new Map(defs.variables.map(variable => [variable.id, variable]));
  }

  token(variable: SerializedVariable): FigmaToken {
    const collection = this.collections.get(variable.collectionId);
    const collectionName = collection?.name;
    const modes = this.modesOf(variable);
    return {
      name: variable.name,
      value: this.resolve(variable, null, new Set()),
      type: variable.resolvedType,
      ...(collectionName === undefined || collectionName.length === 0
        ? {}
        : { collection: collectionName }),
      ...(modes === undefined ? {} : { modes }),
      ...(variable.scopes === undefined ? {} : { scopes: variable.scopes }),
    };
  }

  private valueAt(
    variable: SerializedVariable,
    context: ModeContext | null,
  ): SerializedVariableValue | undefined {
    const collection = this.collections.get(variable.collectionId);
    if (collection !== undefined) {
      const modeId = modeIn(collection, context);
      if (modeId in variable.valuesByMode) return variable.valuesByMode[modeId];
    }
    return Object.values(variable.valuesByMode).at(0);
  }

  private chase(id: string, context: ModeContext | null, seen: Set<string>): FigmaTokenValue {
    const target = this.variables.get(id);
    return target === undefined ? null : this.resolve(target, context, seen);
  }

  private resolveComposed(
    value: SerializedVariableComposedColor,
    context: ModeContext | null,
    seen: Set<string>,
  ): FigmaTokenValue {
    const base = isAlias(value.color)
      ? this.chase(value.color.id, context, new Set(seen))
      : toHex(value.color, 1);
    const opacity =
      typeof value.opacity === 'number'
        ? value.opacity
        : this.chase(value.opacity.id, context, new Set(seen));
    if (typeof base !== 'string' || typeof opacity !== 'number') return null;
    return withAlpha(base, opacity / OPACITY_PERCENT_SCALE);
  }

  private resolve(
    variable: SerializedVariable,
    context: ModeContext | null,
    seen: Set<string>,
  ): FigmaTokenValue {
    if (seen.has(variable.id)) return null;
    seen.add(variable.id);
    const value = this.valueAt(variable, context);
    if (value === undefined) return null;
    if (isAlias(value)) return this.chase(value.id, context, seen);
    if (isRgba(value)) return toHex(value, value.a);
    if (isComposedColor(value)) return this.resolveComposed(value, context, seen);
    return typeof value === 'object' && value !== null ? formatEasing(value) : value;
  }

  private modesOf(variable: SerializedVariable): FigmaToken['modes'] {
    const collection = this.collections.get(variable.collectionId);
    if (collection === undefined || collection.modes.length < 2) return undefined;
    const values: Record<string, FigmaTokenValue> = {};
    for (const mode of collection.modes) {
      const key = mode.name in values ? `${mode.name} (${mode.modeId})` : mode.name;
      values[key] = this.resolve(variable, { modeId: mode.modeId, name: mode.name }, new Set());
    }
    const unique = new Set(Object.values(values));
    return unique.size > 1 ? values : undefined;
  }
}
