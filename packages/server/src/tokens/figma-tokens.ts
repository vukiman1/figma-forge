import { type GetStylesResult, type GetVariableDefsResult, toHex } from '@figma-forge/core';

import type { FigmaToken } from './figma-token.js';
import { FigmaVariableResolver } from './figma-variable-resolver.js';

export type { FigmaToken } from './figma-token.js';

export const resolveFigmaTokens = (defs: GetVariableDefsResult): FigmaToken[] => {
  const resolver = new FigmaVariableResolver(defs);
  return defs.variables.map(variable => resolver.token(variable));
};

export const resolvePaintStyleTokens = (paints: GetStylesResult['paints']): FigmaToken[] => {
  const tokens: FigmaToken[] = [];
  for (const style of paints) {
    const visible = style.paints.filter(paint => paint.visible);
    const paint = visible.length === 1 ? visible.at(0) : undefined;
    if (paint === undefined || paint.type !== 'SOLID' || !('color' in paint)) continue;
    tokens.push({
      name: style.name,
      value: toHex(paint.color, paint.opacity),
      type: 'COLOR',
      source: 'style',
    });
  }
  return tokens;
};
