import type { SerializedShaderProperty, SerializedShaderValue } from '@figma-forge/core';

export interface SerializedShader {
  shaderId: string;
  shaderProperties?: SerializedShaderProperty[];
}

const copyShaderValue = (value: ShaderPropertyValue): SerializedShaderValue =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a JSON round trip of a Figma shader value is plain data of the same shape
  JSON.parse(JSON.stringify(value)) as SerializedShaderValue;

const serializeShaderProperty = (
  id: string,
  value: ShaderPropertyValue,
  definition: ShaderPropertyDefinition | undefined,
): SerializedShaderProperty => {
  const property: SerializedShaderProperty = {
    id,
    ...(definition === undefined ? {} : { name: definition.name, type: definition.type }),
    value: copyShaderValue(value),
  };
  if (definition?.description !== undefined && definition.description !== '') {
    property.description = definition.description;
  }
  return property;
};

export const serializeShader = (shader: ShaderPaint | ShaderEffect): SerializedShader => {
  const metadata = shader.propertyMetadata ?? {};
  const properties = Object.entries(shader.properties ?? {}).map(([id, value]) =>
    serializeShaderProperty(id, value, metadata[id]),
  );
  return {
    shaderId: shader.id,
    ...(properties.length > 0 ? { shaderProperties: properties } : {}),
  };
};
