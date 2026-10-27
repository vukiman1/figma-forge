import { MIXED, type Mixed } from '../model/primitives.js';
import { pickDefined } from '../object/pick-defined.js';
import type { DesignContextNode } from './node.js';

export const TYPOGRAPHY_KEYS = [
  'lineHeight',
  'letterSpacing',
  'textCase',
  'textDecoration',
  'paragraphSpacing',
  'paragraphIndent',
  'textWrapStyle',
] as const;

const uniform = <V>(value: V | Mixed | undefined): V | undefined =>
  value === MIXED ? undefined : value;

const uniformTypography = (node: DesignContextNode) =>
  pickDefined(
    {
      lineHeight: uniform(node.lineHeight),
      letterSpacing: uniform(node.letterSpacing),
      textCase: uniform(node.textCase),
      textDecoration: uniform(node.textDecoration),
      paragraphSpacing: node.paragraphSpacing,
      paragraphIndent: node.paragraphIndent,
      textWrapStyle: node.textWrapStyle,
    },
    TYPOGRAPHY_KEYS,
  );

export const extractTextStyle = (node: DesignContextNode) => {
  const { fontSize, fontName } = node;
  if (typeof fontSize !== 'number' || typeof fontName !== 'object') return null;
  return {
    fontFamily: fontName.family,
    fontStyle: fontName.style,
    fontSize,
    ...(fontName.variationSettings === undefined
      ? {}
      : { fontVariationSettings: fontName.variationSettings }),
    ...uniformTypography(node),
  };
};
