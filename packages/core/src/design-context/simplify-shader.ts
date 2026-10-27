import { toHex } from '../color/hex.js';
import type { SerializedColor } from '../model/primitives.js';
import type { SerializedShaderProperty, SerializedShaderValue } from '../model/shader.js';

type SimplifiedShaderValue = boolean | string | number | Record<string, unknown>;

export interface SimplifiedShaderProperty {
  name?: string;
  id?: string;
  type?: string;
  value: SimplifiedShaderValue;
  description?: string;
}

const isRgb = (value: object): value is SerializedColor & { a?: number } =>
  'r' in value && 'g' in value && 'b' in value;

const shaderColor = (color: object): object | string =>
  isRgb(color) ? toHex(color, color.a) : color;

const simplifyShaderValue = (value: SerializedShaderValue): SimplifiedShaderValue => {
  if (typeof value !== 'object') return value;
  if (isRgb(value)) return toHex(value, value.a);
  if ('color' in value) return { ...value, color: shaderColor(value.color) };
  if ('stops' in value) {
    return {
      stops: value.stops.map(stop => ({ position: stop.position, color: shaderColor(stop.color) })),
    };
  }
  return { ...value };
};

export const simplifyShaderProperties = (
  properties: readonly SerializedShaderProperty[],
): SimplifiedShaderProperty[] =>
  properties.map(property => ({
    ...(property.name === undefined ? { id: property.id } : { name: property.name }),
    ...(property.type === undefined ? {} : { type: property.type }),
    value: simplifyShaderValue(property.value),
    ...(property.description === undefined ? {} : { description: property.description }),
  }));
