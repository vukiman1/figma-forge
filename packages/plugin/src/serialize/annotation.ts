import type { SerializedAnnotation } from '@figma-forge/core';

export const serializeAnnotation = (annotation: Annotation): SerializedAnnotation => {
  const out: SerializedAnnotation = {};
  if (annotation.label !== undefined) out.label = annotation.label;
  if (annotation.labelMarkdown !== undefined) out.labelMarkdown = annotation.labelMarkdown;
  if (annotation.categoryId !== undefined) out.categoryId = annotation.categoryId;
  if (annotation.properties !== undefined) {
    out.properties = annotation.properties.map(property => property.type);
  }
  return out;
};
