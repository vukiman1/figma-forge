import type { SerializedNode } from '@figma-forge/core';

import { serializeAnnotation } from '../annotation.js';
import { collectComponentProperties, collectPropertyReferences } from '../component-properties.js';
import { fieldOf } from '../field-of.js';
import { collectStyleLinks } from '../style-links.js';
import { isAnnotationList } from './figma-lists.js';

const writeAnnotations = (node: SceneNode, out: SerializedNode): void => {
  const annotations = fieldOf(node, 'annotations');
  if (isAnnotationList(annotations) && annotations.length > 0) {
    out.annotations = annotations.map(annotation => serializeAnnotation(annotation));
  }
};

export const writeMetadataFields = (node: SceneNode, out: SerializedNode): void => {
  writeAnnotations(node, out);
  collectStyleLinks(node, out);
  collectComponentProperties(node, out);
  collectPropertyReferences(node, out);
};
