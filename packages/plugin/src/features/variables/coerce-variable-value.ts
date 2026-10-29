import { SET_VARIABLE_VALUE_TOOL_NAME as TOOL } from '@figma-forge/core';

const NUMERIC_TYPES: ReadonlySet<VariableResolvedDataType> = new Set(['FLOAT', 'TIMING']);
const OBJECT_TYPES: ReadonlySet<VariableResolvedDataType> = new Set(['COLOR', 'EASING']);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new TypeError(`${TOOL}: "${text}" is not valid JSON`);
  }
};

const parseNumber = (text: string): number => {
  const value = Number(text);
  if (Number.isNaN(value)) throw new TypeError(`${TOOL}: "${text}" is not a number`);
  return value;
};

export const coerceVariableValue = (
  raw: unknown,
  resolvedType: VariableResolvedDataType,
): unknown => {
  if (typeof raw !== 'string') return raw;
  if (raw.trimStart().startsWith('{')) return parseJson(raw);
  if (NUMERIC_TYPES.has(resolvedType)) return parseNumber(raw);
  if (resolvedType === 'BOOLEAN') return raw === 'true';
  if (OBJECT_TYPES.has(resolvedType)) {
    throw new TypeError(`${TOOL}: ${resolvedType} value "${raw}" is not valid JSON`);
  }
  return raw;
};
