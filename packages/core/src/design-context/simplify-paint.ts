import { toHex } from '../color/hex.js';
import type {
  SerializedGradientPaint,
  SerializedMediaPaint,
  SerializedPaint,
  SerializedPatternPaint,
} from '../model/paint.js';
import { pickDefined } from '../object/pick-defined.js';
import { type SimplifiedShaderProperty, simplifyShaderProperties } from './simplify-shader.js';

export interface SimplifiedPaint {
  type: string;
  color?: string;
  gradientStops?: { position: number; color: string }[];
  gradientTransform?: number[][];
  cssAngle?: number;
  scaleMode?: string;
  imageTransform?: number[][];
  cssTransform?: string;
  opacity?: number;
  filtersApplied?: true;
  sourceNodeId?: string;
  tileType?: string;
  scalingFactor?: number;
  spacing?: { x: number; y: number };
  horizontalAlignment?: string;
  verticalAlignment?: string;
  shaderId?: string;
  shaderProperties?: SimplifiedShaderProperty[];
  visible?: false;
}

type PaintDetails = Omit<SimplifiedPaint, 'type' | 'opacity' | 'visible'>;

const simplifyGradient = (paint: SerializedGradientPaint): PaintDetails => ({
  gradientStops: paint.gradientStops.map(stop => ({
    position: stop.position,
    color: toHex(stop.color, stop.color.a * paint.opacity),
  })),
  gradientTransform: paint.gradientTransform,
  ...pickDefined(paint, ['cssAngle']),
});

const simplifyMedia = (paint: SerializedMediaPaint): PaintDetails => {
  if (paint.scaleMode === undefined) return {};
  return {
    scaleMode: paint.scaleMode,
    ...pickDefined(paint, ['imageTransform', 'cssTransform']),
    ...(paint.filtersApplied === true ? { filtersApplied: true } : {}),
  };
};

const simplifyPattern = (paint: SerializedPatternPaint): PaintDetails => ({
  sourceNodeId: paint.sourceNodeId,
  tileType: paint.tileType,
  scalingFactor: paint.scalingFactor,
  ...pickDefined(paint, ['spacing', 'horizontalAlignment', 'verticalAlignment']),
});

const detailsOf = (paint: SerializedPaint): PaintDetails => {
  switch (paint.type) {
    case 'SOLID':
      return { color: toHex(paint.color, paint.opacity) };
    case 'IMAGE':
    case 'VIDEO':
      return simplifyMedia(paint);
    case 'PATTERN':
      return simplifyPattern(paint);
    case 'SHADER':
      return {
        shaderId: paint.shaderId,
        ...(paint.shaderProperties === undefined
          ? {}
          : { shaderProperties: simplifyShaderProperties(paint.shaderProperties) }),
      };
    default:
      return simplifyGradient(paint);
  }
};

const opacityIsInColor = (paint: SerializedPaint): boolean =>
  paint.type === 'SOLID' || 'gradientStops' in paint;

export const simplifyPaint = (paint: SerializedPaint): SimplifiedPaint => ({
  type: paint.type,
  ...detailsOf(paint),
  ...(opacityIsInColor(paint) || paint.opacity === 1 ? {} : { opacity: paint.opacity }),
  ...(paint.visible ? {} : { visible: false }),
});
