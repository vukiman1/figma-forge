import type { GetStylesResult, SerializedLineHeight, SerializedTextStyle } from '@figma-forge/core';

import {
  collectBindings,
  serializeEffect,
  serializeFontName,
  serializeLayoutGrid,
  serializePaint,
} from '../../serializer.js';

const identityOf = (style: BaseStyle) => ({
  id: style.id,
  name: style.name,
  key: style.key,
  description: style.description,
});

const serializeLineHeight = (lineHeight: LineHeight): SerializedLineHeight =>
  lineHeight.unit === 'AUTO'
    ? { unit: 'AUTO' }
    : { unit: lineHeight.unit, value: lineHeight.value };

export const serializePaintStyle = (style: PaintStyle): GetStylesResult['paints'][number] => ({
  ...identityOf(style),
  paints: style.paints.map(paint => serializePaint(paint, null)),
});

export const serializeTextStyle = (style: TextStyle): SerializedTextStyle => {
  const bound = collectBindings(style.boundVariables);
  return {
    ...identityOf(style),
    fontName: serializeFontName(style.fontName),
    fontSize: style.fontSize,
    lineHeight: serializeLineHeight(style.lineHeight),
    letterSpacing: { unit: style.letterSpacing.unit, value: style.letterSpacing.value },
    textWrapStyle: style.textWrapStyle,
    ...(bound === undefined ? {} : { boundVariables: bound }),
  };
};

export const serializeEffectStyle = (style: EffectStyle): GetStylesResult['effects'][number] => ({
  ...identityOf(style),
  effects: style.effects.map(effect => serializeEffect(effect, null)),
});

export const serializeGridStyle = (style: GridStyle): GetStylesResult['grids'][number] => ({
  ...identityOf(style),
  grids: style.layoutGrids.map(serializeLayoutGrid),
});
