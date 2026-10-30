import type { ObjectExpression } from 'oxc-parser';

import { propertyNamed } from './literal-values.js';
import { type Scale, UNO_WIND3_SCALES, UNO_WIND4_SCALES } from './scale-tables.js';
import { type JsConfigTokens, readThemeScales, type ScalePickContext } from './theme-tokens.js';
import { scanUnoPresets } from './uno-presets.js';

const AMBIGUOUS_KEYS: ReadonlySet<string> = new Set(['container']);

const discriminators = (mine: readonly Scale[], other: readonly Scale[]): readonly Scale[] =>
  mine.filter(
    scale => !AMBIGUOUS_KEYS.has(scale.key) && !other.some(({ key }) => key === scale.key),
  );

const WIND4_ONLY = discriminators(UNO_WIND4_SCALES, UNO_WIND3_SCALES);
const WIND3_ONLY = discriminators(UNO_WIND3_SCALES, UNO_WIND4_SCALES);

const declaredCount = (
  scopes: readonly (ObjectExpression | null)[],
  scales: readonly Scale[],
): number =>
  scales.filter(scale =>
    scopes.some(scope => scope !== null && propertyNamed(scope, scale.key) !== null),
  ).length;

const unoScalesFor = ({ config, program, scopes }: ScalePickContext): readonly Scale[] => {
  const { identified, wind4 } = scanUnoPresets(config, program);
  if (wind4) return UNO_WIND4_SCALES;
  if (identified) return UNO_WIND3_SCALES;
  return declaredCount(scopes, WIND4_ONLY) > declaredCount(scopes, WIND3_ONLY)
    ? UNO_WIND4_SCALES
    : UNO_WIND3_SCALES;
};

export const parseUnoConfig = (filePath: string, code: string): JsConfigTokens =>
  readThemeScales(filePath, code, unoScalesFor);
